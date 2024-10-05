// https://sidsite.com/posts/bpe/
const p1 = `In the beginning God created the heavens and the earth. Now the earth was formless and empty, and darkness {was} over the surface of the deep {waters}, and the Spirit of God was hovering over the surface of the waters. Then God said, “Let there be light.” And there was light. And God saw the light, that {it was} good. Then God separated between the light and the darkness. And God called the light Day, and the darkness he called Night. Then there was evening, and there was morning, one day.`;

const p2 = `In the beginning God created the heavens and the earth. Now the earth was formless and void, and darkness was over the surface of the deep. And the Spirit of God was hovering over the surface of the waters. And God said, “Let there be light,” and there was light. And God saw that the light was good, and He separated the light from the darkness. God called the light “day,” and the darkness He called “night.”`

const p3 = 'Pre-historic levels of hello.';

const segmenter = new Intl.Segmenter('en', { granularity: 'word' });

for (let w of segmenter.segment(p3)) console.log(w.isWordLike, w.segment);

