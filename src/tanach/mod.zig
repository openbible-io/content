const std = @import("std");
const xml = @import("zig-xml");

const Allocator = std.mem.Allocator;
const Bible = @import("../Bible.zig");

fn findFirst(children: []const xml.Node, tag: []const u8) ?xml.Node.Element {
    for (children) |c| switch (c) {
        .element => |e| {
            if (std.mem.eql(u8, e.name.local, tag)) return e;
        },
        else => {},
    };
    return null;
}

fn findAttribute(children: []const xml.Node, name: []const u8) ?[]const u8 {
    for (children) |c| switch (c) {
        .attribute => |a| {
            if (std.mem.eql(u8, a.name.local, name)) return a.value;
        },
        else => {},
    };
    return null;
}

fn getText(ele: xml.Node.Element) ?[]const u8 {
    if (ele.children.len == 0) return null;
    switch (ele.children[0]) {
        .text => |t| return t.content,
        else => return null,
    }
}

/// ghetto
fn findPath(children: []const xml.Node, path: []const u8) ?xml.Node.Element {
    var iter = std.mem.splitScalar(u8, path, '/');
    var res = findFirst(children, iter.first());
    while (iter.next()) |p| {
        if (res) |r| res = findFirst(r.children, p) else break;
    }

    return res;
}

const Iterator = struct {
    children: []const xml.Node,
    index: usize = 0,

    pub fn nextElement(self: *@This(), tag: []const u8) ?xml.Node.Element {
        for (self.children[self.index..]) |c| {
            defer self.index += 1;
            switch (c) {
                .element => |e| {
                    if (std.mem.eql(u8, e.name.local, tag)) return e;
                },
                else => {},
            }
        }

        return null;
    }
};

fn parseWord(allocator: Allocator, ele: xml.Node.Element) !?Bible.Word {
    var res = Bible.Word{ .text = "" };

    if (ele.name.local.len != 1) return null;
    switch (ele.name.local[0]) {
        'w' => {
            if (findAttribute(ele.children, "type")) |v| {
                if (std.mem.eql(u8, v, "x-ketiv")) res.tag = .ketiv;
                if (std.mem.eql(u8, v, "x-qere")) res.tag = .qere;
            }
            if (findAttribute(ele.children, "lemma")) |_| {
                // TODO: load frozen lexicon and pass to here
            }
        },
        'k' => res.tag = .ketiv,
        'q' => res.tag = .qere,
        else => return null,
    }

    var text = std.ArrayList(u8).init(allocator);
    for (ele.children) |maybe_text| {
        switch (maybe_text) {
            .text => |t| {
                if (t.content.len == 0) continue;
                try text.appendSlice(t.content);
            },
            else => continue,
        }
    }
    res.text = try text.toOwnedSlice();

    return res;
}

fn parseWord2(allocator: Allocator, children: []const xml.Node, acc: *Bible.Words) !void {
    for (children) |maybe_word| {
        const word_ele = switch (maybe_word) {
            .element => |e| e,
            else => continue,
        };

        if (try parseWord(allocator, word_ele)) |w| {
            try acc.append(allocator, w);
        } else { try parseWord2(allocator, word_ele.children, acc);
        }
    }
}

fn parseChapters(
    allocator: Allocator,
    book: xml.Node.Element,
    book_name: Bible.BookName,
    comptime is_tanach_us: bool,
    out: *Bible,
) !void {
    var chapters = try allocator.create(Bible.Chapters);
    chapters.* = Bible.Chapters{};

    var iter1 = Iterator{ .children = book.children };
    while (iter1.nextElement(if (is_tanach_us) "c" else "chapter")) |chapter_ele| {
        var chapter = try allocator.create(Bible.Verses);
        chapter.* = Bible.Verses{};

        var iter2 = Iterator{ .children = chapter_ele.children };
        while (iter2.nextElement(if (is_tanach_us) "v" else "verse")) |verse_ele| {
            const verse = try allocator.create(Bible.Words);
            verse.* = Bible.Words{};

            try parseWord2(allocator, verse_ele.children, verse);

            try chapter.append(allocator, verse);
        }
        try chapters.append(allocator, chapter);
    }

    // CORRECTIONS!!!
    if (is_tanach_us) {
        switch (book_name) {
            .gen => {
                const verses: *Bible.Verses = chapters.items[14 - 1];
                const words: *Bible.Words = verses.items[17 - 1];
                // merge 9th and 10th words (removing ־) to be consistent with verses 1, 4, 5, and 9.
                // not sure why this was accepted: https://www.tanach.us/Changes/2021.04.01%20-%20Changes/2021.04.01%20-%20Changes.xml?2021.02.22-3
                // and this rejected: https://www.tanach.us/Changes/2022.10.19%20-%20Changes/2022.10.19%20-%20Changes.xml?2022.07.02-6
                const word9 = words.items[9 - 1].text;
                const word10 = words.items[10 - 1].text;
                const new = try std.fmt.allocPrint(
                    allocator,
                    "{s}{s}",
                    .{ word9[0..word9.len - "־".len], word10 },
                );
                std.debug.print("{s}\n", .{ new });
                allocator.free(words.items[9 - 1].text);
                allocator.free(words.items[10 - 1].text);
                words.replaceRangeAssumeCapacity(9 - 1, 2, &[_]Bible.Word{ .{ .text = new } });
            },
            else => {},
        }
    }

    out.books_mutex.lock();
    defer out.books_mutex.unlock();
    try out.books.putNoClobber(book_name, chapters);
}

pub fn parseTanachUs(allocator: std.mem.Allocator, fname: []const u8, out: *Bible) !void {
    var file = try std.fs.cwd().openFile(fname, .{});
    defer file.close();

    const doc = try xml.readDocument(allocator, file.reader(), .{});

    const book = findPath(doc.value.children, "Tanach/tanach/book") orelse return error.MissingBook;
    const name = findPath(book.children, "names/name") orelse return error.MissingName;
    const english_name = getText(name) orelse return error.MissingName;
    const book_name = try Bible.BookName.fromEnglish(english_name);

    try parseChapters(allocator, book, book_name, true, out);
}

pub fn parseMorphHb(allocator: std.mem.Allocator, fname: []const u8, out: *Bible) !void {
    var file = try std.fs.cwd().openFile(fname, .{});
    defer file.close();

    const doc = try xml.readDocument(allocator, file.reader(), .{});

    const book = findPath(doc.value.children, "osis/osisText/div") orelse return error.MissingBook;
    const english_name = findAttribute(book.children, "osisID") orelse return error.MissingName;
    const book_name = try Bible.BookName.fromEnglish(english_name);

    try parseChapters(allocator, book, book_name, false, out);
}
