const std = @import("std");
const usfm = @import("./usfm/mod.zig");
const tanach = @import("./tanach/mod.zig");
const simargs = @import("simargs");
const Bible = @import("./Bible.zig");

pub const std_options = .{
    .log_level = .warn,
};
const Allocator = std.mem.Allocator;

fn parseUsfm(allocator: Allocator, outdir: []const u8, fname: []const u8) void {
    usfm.writeHtml(allocator, outdir, fname) catch |e| {
        std.debug.print("Error parsing {s}: {}\n", .{ fname, e });
        std.process.exit(1);
    };
}

fn parseTanach(allocator: Allocator, fname: []const u8, out: *Bible) void {
    tanach.parseTanachUs(allocator, fname, out) catch |e| {
        std.debug.print("Error parsing {s}: {}\n", .{ fname, e });
        std.process.exit(1);
    };
}

fn parseMorphHb(allocator: Allocator, fname: []const u8, out: *Bible) void {
    tanach.parseMorphHb(allocator, fname, out) catch |e| {
        std.debug.print("Error parsing {s}: {}\n", .{ fname, e });
        std.process.exit(1);
    };
}

fn parseBible(
    allocator: std.mem.Allocator,
    thread_pool: *std.Thread.Pool,
    wg: *std.Thread.WaitGroup,
    d: []const u8,
    parse_fn: fn (allocator: Allocator, fname: []const u8, out: *Bible) void,
) !Bible {
    var dir = try std.fs.cwd().openDir(d, .{ .iterate = true });
    defer dir.close();

    var arena = std.heap.ArenaAllocator.init(allocator);
    defer arena.deinit();

    var res = Bible.init(allocator);
    var iter = dir.iterate();
    while (try iter.next()) |n| {
        if (
            n.kind != .file or
            !std.mem.endsWith(u8, n.name, ".xml") or
            std.mem.eql(u8, n.name, "VerseMap.xml")
        ) continue;
        const fname = try std.fs.path.join(arena.allocator(), &[_][]const u8{ d, n.name });
        thread_pool.spawnWg(wg, parse_fn, .{ allocator, fname, &res });
    }

    thread_pool.waitAndWork(wg);
    wg.reset();

    return res;
}

pub fn main() !void {
    // var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    // defer std.debug.assert(gpa.deinit() == .ok);
    var arena = std.heap.ArenaAllocator.init(std.heap.page_allocator);
    defer arena.deinit();
    var gpa = std.heap.ThreadSafeAllocator{ .child_allocator = arena.allocator() };
    const allocator = gpa.allocator();

    var opt = try simargs.parse(allocator, struct {
        output_dir: []const u8 = "dist",
        tanach_dir: []const u8 = "sources/bibles/tanach.us",
        morphhb_dir: []const u8 = "sources/bibles/morphhb/wlc",
        help: bool = false,

        pub const __shorts__ = .{
            .output_dir = .o,
            .help = .h,
        };
    }, "[usfm]", null);
    defer opt.deinit();

    var thread_pool: std.Thread.Pool = undefined;
    try thread_pool.init(.{ .allocator = allocator });
    defer thread_pool.deinit();
    var wg = std.Thread.WaitGroup{};

    // generate tanach reference files
    var og = try parseBible(allocator, &thread_pool, &wg, opt.args.tanach_dir, parseTanach);
    defer og.deinit();
    var morph = try parseBible(allocator, &thread_pool, &wg, opt.args.morphhb_dir, parseMorphHb);
    defer morph.deinit();

    // align
    for (@intFromEnum(Bible.BookName.gen)..@intFromEnum(Bible.BookName.mat)) |book_i| {
        const book_name: Bible.BookName = @enumFromInt(book_i);
        const a_chapters = og.books.get(book_name) orelse return error.TanachUsMissingBook;
        const b_chapters = morph.books.get(book_name) orelse return error.MorphMissingBook;

        std.debug.print("{s}\n", .{ @tagName(book_name) });
        if (a_chapters.items.len != b_chapters.items.len) return error.ChapterLengthMismatch;

        for (a_chapters.items, b_chapters.items, 1..) |a_c, b_c, c_num| {
            if (a_c.items.len != b_c.items.len) {
                std.debug.print(
                    "{d}\t{d: >4} | {d: >5}\n",
                    .{ c_num,  a_c.items.len, b_c.items.len },
                );
                // return error.VerseLengthMismatch;
            }
            for (a_c.items, b_c.items, 1..) |a_verses, b_verses, v_num| {
                if (a_verses.items.len != b_verses.items.len) {
                    std.debug.print(
                        "{d}:{d}\t{d: >4} | {d: >5}\n",
                        .{ c_num,  v_num, a_verses.items.len, b_verses.items.len },
                    );
                    for (a_verses.items) |w| std.debug.print("{s}\n", .{ w.text });
                    std.debug.print("vs\n", .{});
                    for (b_verses.items) |w| std.debug.print("{s}\n", .{ w.text });
                    // return error.WordLengthMismatch;
                }
            }
        }
    }

    // usfm files
    for (opt.positional_args.items) |fname| {
        thread_pool.spawnWg(&wg, parseUsfm, .{ allocator, opt.args.output_dir, fname });
    }
    thread_pool.waitAndWork(&wg);
}

test {
    _ = Bible;
    // _ = usfm;
}
