/**
 * Everything on the site comes from this file. Edit it to make the year yours.
 *
 * Each item can have:
 *   title   (required)  Shown under the picture and in the detail panel.
 *   date    (required)  Any text, e.g. '14 Mar' or 'Spring'.
 *   text                A sentence or two for the detail panel.
 *   image               Path to a picture in /public, e.g. 'media/my-project.jpg'.
 *   video               Path to an .mp4 in /public, e.g. 'media/my-reel.mp4'.
 *   chroma              true if the video has a pure green background to remove.
 *   chromaKey           The green to remove, if it isn't #00ff00.
 *   ratio               Width / height. Worked out from the image if you leave it out.
 *   size                's', 'm' or 'l'. Defaults to 'm'.
 *   link                A URL for the "Visit the project" link.
 *
 * Items without an image or video get a generated placeholder in that month's colours.
 *
 * Special days (Thai holidays, birthdays) are listed in `specialDays` at the bottom of this file.
 * Everything in a month is placed along the path by its day number, so dates decide the order.
 */

export const site = {
  studio: 'Your Studio',
  year: 2026,
  title: '2026 in review',
  headline: 'Our 2026, from first light to last',
  intro:
    'Twelve months of work laid out as a single day. January starts before sunrise and December ends after dark.',
  contact: 'mailto:hello@example.com',
  outro: 'That was 2026',
};

export const months = [
  {
    name: 'January',
    items: [
      { date: '8 Jan', title: 'New year, new studio', text: 'We moved into a bigger space by the river, with room for a workshop and a proper kitchen.', ratio: 4 / 3 },
      { date: '19 Jan', title: 'Brand refresh for Hearth Ceramics', text: 'A warmer identity for a family pottery, built around the marks their kilns leave on every piece.', ratio: 3 / 4 },
      { date: '30 Jan', title: 'Winter reading list', text: 'The team picked one book each. We wrote about what stuck with us.', ratio: 1, size: 's' },
    ],
  },
  {
    name: 'February',
    items: [
      { date: '6 Feb', title: 'Field guide app, first prototype', text: 'Point your phone at a tree and it tells you its story. Tested with two school groups.', ratio: 3 / 4 },
      { date: '17 Feb', title: 'Typeface sketches', text: 'Early drawings for a display face we will finish later in the year.', ratio: 16 / 10, size: 'l' },
      { date: '26 Feb', title: 'Talk at the design meetup', text: 'Twenty minutes on starting projects in code instead of in mockups.', ratio: 1 },
    ],
  },
  {
    name: 'March',
    items: [
      { date: '4 Mar', title: 'Launch site for Tidewater Bikes', text: 'A product site where the bikes are built in front of you as you scroll.', ratio: 16 / 10 },
      { date: '15 Mar', title: 'Packaging for Small Batch Tea', text: 'Twelve blends, twelve colours, one fold-flat box.', ratio: 3 / 4 },
      { date: '28 Mar', title: 'Two new people', text: 'A developer and a motion designer joined us. Lunch got louder.', ratio: 4 / 3, size: 's' },
    ],
  },
  {
    name: 'April',
    items: [
      { date: '9 Apr', title: 'Museum wayfinding', text: 'Signs, maps and a quiet colour system for a natural history museum.', ratio: 3 / 4, size: 'l' },
      { date: '20 Apr', title: 'Spring open studio', text: 'We opened the doors for an evening of prints, demos and far too much bread.', ratio: 4 / 3 },
      { date: '29 Apr', title: 'Recipe cards', text: 'A small print run for a neighbourhood cookbook.', ratio: 1, size: 's' },
    ],
  },
  {
    name: 'May',
    items: [
      { date: '7 May', title: 'Motion study', text: 'Colour fields drifting into each other. This one is a video, so it only plays when you slow down near it.', video: 'media/sample-loop.mp4', ratio: 4 / 3 },
      { date: '18 May', title: 'Annual report for a housing charity', text: 'Hard numbers told gently, with portraits of the people behind them.', ratio: 3 / 4 },
      { date: '27 May', title: 'Award shortlist', text: 'The Tidewater site made a shortlist. We did not win, and the party was still good.', ratio: 1 },
    ],
  },
  {
    name: 'June',
    items: [
      { date: '5 Jun', title: 'Festival identity', text: 'Posters, wristbands and a stage screen system for a three-day music festival.', ratio: 3 / 4, size: 'l' },
      { date: '16 Jun', title: 'Midsummer team trip', text: 'Two days on the coast. No laptops, one very long walk.', ratio: 16 / 10 },
      { date: '26 Jun', title: 'Open source release', text: 'We published the small animation library we use on most projects.', ratio: 1, size: 's' },
    ],
  },
  {
    name: 'July',
    items: [
      { date: '3 Jul', title: 'Booking flow for a climbing gym', text: 'From six steps to two. Fewer people give up halfway now.', ratio: 4 / 3 },
      { date: '14 Jul', title: 'Mural for the new office', text: 'Painted over a weekend by the whole team, with mixed results and lots of joy.', ratio: 3 / 4 },
      { date: '25 Jul', title: 'Summer interns', text: 'Three students spent six weeks with us and shipped real work.', ratio: 1 },
    ],
  },
  {
    name: 'August',
    items: [
      { date: '6 Aug', title: 'Exhibition catalogue', text: 'A 200-page book for a photography show, printed on uncoated stock.', ratio: 3 / 4, size: 'l' },
      { date: '19 Aug', title: 'Weather app redesign', text: 'Less data on screen, more of what you need when you step outside.', ratio: 16 / 10 },
      { date: '28 Aug', title: 'The typeface is finished', text: 'The February sketches became a full family with four weights.', ratio: 1, size: 's' },
    ],
  },
  {
    name: 'September',
    items: [
      { date: '4 Sep', title: 'Rebrand for a regional rail line', text: 'Livery, timetables and a station signage kit.', ratio: 16 / 10, size: 'l' },
      { date: '16 Sep', title: 'Workshop with design students', text: 'A week teaching shaders to people who had never written code.', ratio: 4 / 3 },
      { date: '27 Sep', title: 'Harvest market posters', text: 'Hand-cut stencils, scanned and set in the new typeface.', ratio: 3 / 4 },
    ],
  },
  {
    name: 'October',
    items: [
      { date: '7 Oct', title: 'Online shop for a bakery', text: 'Order by noon, collect by four. Sold out the first weekend.', ratio: 4 / 3 },
      { date: '18 Oct', title: 'Interactive story for a science centre', text: 'Children steer a drop of water from the clouds to the sea.', ratio: 3 / 4, size: 'l' },
      { date: '29 Oct', title: 'Five years of the studio', text: 'We looked back at every project and kept the best mistakes.', ratio: 1 },
    ],
  },
  {
    name: 'November',
    items: [
      { date: '6 Nov', title: 'Identity for a night ferry', text: 'Built to work in the dark, on wet decks and on tired eyes.', ratio: 16 / 10 },
      { date: '17 Nov', title: 'Charity calendar', text: 'Twelve illustrators, one month each, all proceeds to the food bank.', ratio: 3 / 4 },
      { date: '26 Nov', title: 'Quiet month for research', text: 'Time to try new tools before the year ends.', ratio: 1, size: 's' },
    ],
  },
  {
    name: 'December',
    items: [
      { date: '5 Dec', title: 'Winter lights trail', text: 'Projection-mapped trees for a park, controlled from a phone.', ratio: 3 / 4, size: 'l' },
      { date: '16 Dec', title: 'A wave goodbye', text: 'Filmed on a green screen. A shader removes the green so the scene shows through.', video: 'media/chroma-sample.mp4', chroma: true, ratio: 1 },
      { date: '22 Dec', title: 'See you next year', text: 'The studio closes for two weeks. Thanks to everyone we worked with.', ratio: 4 / 3 },
    ],
  },
];

/**
 * Special days, shown as round date medallions floating above the path.
 * Dates are for 2026; several Buddhist holidays follow the lunar calendar and move each year.
 *
 *   date    (required)  Starts with the day number, e.g. '13 Apr' or '13–15 Apr'.
 *   title   (required)  English name.
 *   thai                Thai name, shown on the medallion and in the panel.
 *   text                A sentence for the detail panel.
 *   color               Medallion colour.
 *   motif               Small drawing on the medallion: 'star', 'lotus', 'drops', 'krathong',
 *                       'flower', 'lantern', 'elephant', 'rays', 'rice' or 'plus'.
 *   kind: 'birthday'    Turns the day into a cake with candles and fireworks instead.
 */
export const specialDays = {
  January: [
    { date: '1 Jan', title: "New Year's Day", thai: 'วันขึ้นปีใหม่', text: 'The first public holiday of the year. Many people start it by making merit at a temple.', color: '#f3d27a', motif: 'star' },
    { date: '10 Jan', title: "Children's Day", thai: 'วันเด็กแห่งชาติ', text: 'Held on the second Saturday of January. Government buildings and army bases open their doors to kids.', color: '#9fd3c7', motif: 'star' },
    { date: '16 Jan', title: "Teachers' Day", thai: 'วันครู', text: 'Students thank their teachers, often with flowers and a respectful wai.', color: '#f1c3b1', motif: 'flower' },
  ],
  February: [
    { date: '17 Feb', title: 'Chinese New Year', thai: 'วันตรุษจีน', text: 'Red lanterns, lion dances and family reunions, especially around Yaowarat in Bangkok.', color: '#e0605a', motif: 'lantern' },
  ],
  March: [
    { date: '3 Mar', title: 'Makha Bucha', thai: 'วันมาฆบูชา', text: 'A Buddhist holy day on the full moon of the third lunar month. People walk three times around temples by candlelight.', color: '#f3d27a', motif: 'lotus' },
    { date: '13 Mar', title: 'Thai Elephant Day', thai: 'วันช้างไทย', text: "A day for the national animal, often celebrated with fruit buffets for elephants.", color: '#b9c3d6', motif: 'elephant' },
  ],
  April: [
    { date: '6 Apr', title: 'Chakri Memorial Day', thai: 'วันจักรี', text: 'Marks the founding of the Chakri dynasty in 1782.', color: '#f3d27a', motif: 'rays' },
    { date: '13–15 Apr', title: 'Songkran, Thai New Year', thai: 'วันสงกรานต์', text: 'Water poured gently over hands for blessings, and huge water fights in the streets.', color: '#7fc4e8', motif: 'drops' },
  ],
  May: [
    { date: '4 May', title: 'Coronation Day', thai: 'วันฉัตรมงคล', text: "Marks King Vajiralongkorn's coronation in 2019.", color: '#f3d27a', motif: 'rays' },
    { date: '13 May', title: 'Royal Ploughing Ceremony', thai: 'วันพืชมงคล', text: "An ancient rite that opens the rice-planting season and forecasts the year's harvest. Also National Farmers' Day.", color: '#c9dc8e', motif: 'rice' },
    { date: '31 May', title: 'Visakha Bucha', thai: 'วันวิสาขบูชา', text: "Marks the Buddha's birth, enlightenment and passing. It falls on a Sunday this year, so the holiday is on 1 June.", color: '#f3d27a', motif: 'lotus' },
  ],
  June: [
    { date: '3 Jun', title: "Queen Suthida's Birthday", thai: 'วันเฉลิมพระชนมพรรษาพระราชินี', text: 'A public holiday for the birthday of Queen Suthida.', color: '#c6b3e6', motif: 'rays' },
  ],
  July: [
    { date: '28 Jul', title: "King's Birthday", thai: 'วันเฉลิมพระชนมพรรษา', text: 'The birthday of King Maha Vajiralongkorn, Rama X.', color: '#f3d27a', motif: 'rays' },
    { date: '29–30 Jul', title: 'Asanha Bucha and Khao Phansa', thai: 'วันอาสาฬหบูชา', text: "Asanha Bucha marks the Buddha's first sermon. The next day Buddhist Lent begins, and monks stay in their temples for three months.", color: '#f0b26a', motif: 'lotus' },
  ],
  August: [
    { date: '12 Aug', title: "Mother's Day", thai: 'วันแม่แห่งชาติ', text: 'Held on the birthday of the late Queen Sirikit. Jasmine is the flower of the day.', color: '#9cc3ea', motif: 'flower' },
  ],
  September: [
    { date: '24 Sep', title: 'Mahidol Day', thai: 'วันมหิดล', text: 'Honours Prince Mahidol Adulyadej, the father of modern medicine and public health in Thailand.', color: '#f3d27a', motif: 'plus' },
  ],
  October: [
    { date: '13 Oct', title: 'King Bhumibol Memorial Day', thai: 'วันนวมินทรมหาราช', text: 'Remembers King Bhumibol Adulyadej, Rama IX, who passed away on this day in 2016.', color: '#f3d27a', motif: 'rays' },
    { date: '23 Oct', title: 'Chulalongkorn Day', thai: 'วันปิยมหาราช', text: 'Remembers King Chulalongkorn, Rama V, who abolished slavery and modernised the country.', color: '#e9c48a', motif: 'rays' },
    { date: '26 Oct', title: 'Ok Phansa', thai: 'วันออกพรรษา', text: 'The end of Buddhist Lent, with boat races, rocket festivals and the Naga fireballs on the Mekong.', color: '#f0b26a', motif: 'lotus' },
  ],
  November: [
    { date: '25 Nov', title: 'Loy Krathong', thai: 'วันลอยกระทง', text: 'Under the full moon, krathong of banana leaf, flowers and candles float on every river and pond. In Chiang Mai, Yi Peng fills the sky with lanterns.', color: '#f3c27a', motif: 'krathong' },
  ],
  December: [
    { kind: 'birthday', date: '2 Dec', title: 'Happy birthday', thai: 'สุขสันต์วันเกิด', text: 'Make a wish. Click the cake for more fireworks and confetti.', color: '#f6b7c4', motif: 'cake' },
    { date: '5 Dec', title: "Father's Day and National Day", thai: 'วันพ่อแห่งชาติ', text: "The birthday of the late King Bhumibol. It falls on a Saturday this year, so the holiday is on Monday 7 December.", color: '#f3d27a', motif: 'flower' },
    { date: '10 Dec', title: 'Constitution Day', thai: 'วันรัฐธรรมนูญ', text: "Marks Thailand's first permanent constitution in 1932.", color: '#b9c3d6', motif: 'rays' },
    { date: '31 Dec', title: "New Year's Eve", thai: 'วันสิ้นปี', text: 'Countdowns along the Chao Phraya, and the last holiday of the year.', color: '#f3d27a', motif: 'star' },
  ],
};
