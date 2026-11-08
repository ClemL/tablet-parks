/**
 * A little about each real park on the cards, shown when a player visits one
 * and whenever they tap a park on their sheet: where it is, the year it became
 * a national park (and when it was first protected, if earlier, under another
 * name), and one fact worth telling the table. Presentation only — no rule
 * reads it, so it stays out of the game state and the views.
 */
export interface ParkFact {
  /** Every state or territory the park lies in. */
  states: string[];
  /** The year it became a national park. */
  year: number;
  /** First protected earlier, under another name. */
  since?: { year: number; as: string };
  fact: string;
}

export const PARK_FACTS: Record<string, ParkFact> = {
  yosemite: {
    states: ['California'],
    year: 1890,
    since: { year: 1864, as: 'the Yosemite Grant' },
    fact: 'Abraham Lincoln signed the Yosemite Grant in 1864, the first time the US government set wild land aside for the public. Yosemite Falls drops 2,425 feet, among the tallest waterfalls in North America.',
  },
  yellowstone: {
    states: ['Wyoming', 'Montana', 'Idaho'],
    year: 1872,
    fact: 'The world’s first national park. It sits on an active supervolcano and holds about half of the world’s active geysers, Old Faithful among them.',
  },
  'grand-canyon': {
    states: ['Arizona'],
    year: 1919,
    since: { year: 1908, as: 'a national monument' },
    fact: 'The canyon runs 277 river miles and is up to a mile deep. The rocks at the bottom are nearly two billion years old.',
  },
  zion: {
    states: ['Utah'],
    year: 1919,
    since: { year: 1909, as: 'Mukuntuweap National Monument' },
    fact: 'Utah’s first national park. In the Narrows the canyon closes to 20 or 30 feet wide between walls a thousand feet tall, and the trail is the river itself.',
  },
  acadia: {
    states: ['Maine'],
    year: 1919,
    since: { year: 1916, as: 'Sieur de Monts National Monument' },
    fact: 'The first national park east of the Mississippi, opened as Lafayette National Park and renamed in 1929. From October to early March, Cadillac Mountain is among the first places in the US to see the sunrise.',
  },
  smokies: {
    states: ['Tennessee', 'North Carolina'],
    year: 1934,
    fact: 'The most visited national park in the country, with more than 12 million visits a year. In late spring its synchronous fireflies flash in unison.',
  },
  'rocky-mountain': {
    states: ['Colorado'],
    year: 1915,
    fact: 'Trail Ridge Road crosses the park at 12,183 feet, the highest continuous paved road in the United States.',
  },
  everglades: {
    states: ['Florida'],
    year: 1947,
    fact: 'The only place on Earth where alligators and crocodiles live side by side, and the first national park set aside to protect an ecosystem rather than scenery.',
  },
  arches: {
    states: ['Utah'],
    year: 1971,
    since: { year: 1929, as: 'a national monument' },
    fact: 'More than 2,000 natural stone arches have been catalogued here, the densest concentration of arches in the world.',
  },
  glacier: {
    states: ['Montana'],
    year: 1910,
    fact: 'About 150 glaciers covered the area in 1850; only around 25 are still big enough to count as active glaciers. Going-to-the-Sun Road crosses the Continental Divide at Logan Pass.',
  },
  olympic: {
    states: ['Washington'],
    year: 1938,
    since: { year: 1909, as: 'Mount Olympus National Monument' },
    fact: 'Three parks in one: glacier-capped peaks, more than 70 miles of wild Pacific coast, and the Hoh Rain Forest, which takes 12 to 14 feet of rain a year.',
  },
  denali: {
    states: ['Alaska'],
    year: 1917,
    fact: 'Its mountain, 20,310 feet high, is the tallest peak in North America. The park opened as Mount McKinley National Park, created largely to protect its Dall sheep and other wildlife from market hunting, and took the name Denali in 1980.',
  },
  sequoia: {
    states: ['California'],
    year: 1890,
    fact: 'The country’s second national park, a week ahead of Yosemite. Its General Sherman Tree is the largest tree on Earth by volume.',
  },
  bryce: {
    states: ['Utah'],
    year: 1928,
    since: { year: 1923, as: 'a national monument' },
    fact: 'Not a canyon at all but a row of natural amphitheaters, filled with the largest collection of hoodoos — tall, thin rock spires — on Earth.',
  },
  'joshua-tree': {
    states: ['California'],
    year: 1994,
    since: { year: 1936, as: 'a national monument' },
    fact: 'Two deserts meet here: the higher, cooler Mojave and the lower Colorado. Joshua trees are not trees but giant yuccas.',
  },
  'grand-teton': {
    states: ['Wyoming'],
    year: 1929,
    fact: 'The Teton Range is among the youngest mountains in the Rockies, under 10 million years old, which is why its peaks rise straight from the valley with no foothills.',
  },
  'crater-lake': {
    states: ['Oregon'],
    year: 1902,
    fact: 'At 1,943 feet, the deepest lake in the United States. It fills the caldera left when Mount Mazama erupted and collapsed about 7,700 years ago.',
  },
  badlands: {
    states: ['South Dakota'],
    year: 1978,
    since: { year: 1939, as: 'a national monument' },
    fact: 'One of the world’s richest fossil beds, with ancient rhinos, horses and saber-toothed cats. Black-footed ferrets, once thought extinct, were returned to the wild here.',
  },
  rainier: {
    states: ['Washington'],
    year: 1899,
    fact: 'The most glaciated peak in the contiguous United States: an active volcano 14,410 feet high, wrapped in more than two dozen glaciers.',
  },
  shenandoah: {
    states: ['Virginia'],
    year: 1935,
    fact: 'Skyline Drive runs 105 miles along the crest of the Blue Ridge, the whole length of the park.',
  },
  'big-bend': {
    states: ['Texas'],
    year: 1944,
    fact: 'More kinds of birds, bats and cacti than any other US national park. The Rio Grande traces 118 miles of its border with Mexico.',
  },
  'hawaii-volcanoes': {
    states: ['Hawaii'],
    year: 1916,
    fact: 'Home to Kīlauea, one of the world’s most active volcanoes, and Mauna Loa, the largest active volcano on Earth. It opened as Hawaii National Park, together with Haleakalā.',
  },
  'death-valley': {
    states: ['California', 'Nevada'],
    year: 1994,
    since: { year: 1933, as: 'a national monument' },
    fact: 'The hottest, driest and lowest national park. Badwater Basin lies 282 feet below sea level, and Furnace Creek recorded 134°F in 1913, the highest air temperature ever measured.',
  },
  saguaro: {
    states: ['Arizona'],
    year: 1994,
    since: { year: 1933, as: 'a national monument' },
    fact: 'Saguaros grow only in the Sonoran Desert. One can take 50 to 70 years to grow its first arm, and live for more than 150.',
  },
  canyonlands: {
    states: ['Utah'],
    year: 1964,
    fact: 'The Colorado and Green Rivers cut the park into four districts: Island in the Sky, the Needles, the Maze, and the rivers themselves.',
  },
  'capitol-reef': {
    states: ['Utah'],
    year: 1971,
    since: { year: 1937, as: 'a national monument' },
    fact: 'It follows the Waterpocket Fold, a wrinkle in the Earth’s crust nearly 100 miles long. In the old orchards of Fruita, visitors may pick fruit in season.',
  },
  'mesa-verde': {
    states: ['Colorado'],
    year: 1906,
    fact: 'The first national park set aside for the works of people. Ancestral Pueblo people built nearly 600 cliff dwellings here; Cliff Palace is the largest.',
  },
  'great-sand-dunes': {
    states: ['Colorado'],
    year: 2004,
    since: { year: 1932, as: 'a national monument' },
    fact: 'The tallest dunes in North America — Star Dune rises about 750 feet. In spring, Medano Creek runs across their foot like a beach.',
  },
  carlsbad: {
    states: ['New Mexico'],
    year: 1930,
    since: { year: 1923, as: 'a national monument' },
    fact: 'The Big Room is the largest single cave chamber by volume in North America, about 8 acres of floor. On summer evenings, hundreds of thousands of bats spiral out of the cave mouth.',
  },
  'mammoth-cave': {
    states: ['Kentucky'],
    year: 1941,
    fact: 'The longest known cave system in the world, with more than 400 miles mapped and new passages still being found.',
  },
  voyageurs: {
    states: ['Minnesota'],
    year: 1975,
    fact: 'Nearly 40 percent of the park is water, so most of it is reached by boat. It is named for the French-Canadian canoemen who carried furs through these lakes.',
  },
  'isle-royale': {
    states: ['Michigan'],
    year: 1940,
    fact: 'Its wolves and moose have been studied since 1958, the longest-running predator–prey study in the world. The island park closes every winter.',
  },
  'theodore-roosevelt': {
    states: ['North Dakota'],
    year: 1978,
    since: { year: 1947, as: 'Theodore Roosevelt National Memorial Park' },
    fact: 'Roosevelt came here to hunt bison in 1883 and stayed to ranch. He said he would never have been president had it not been for his years in North Dakota.',
  },
  'wind-cave': {
    states: ['South Dakota'],
    year: 1903,
    fact: 'The first cave anywhere in the world to be made a national park. It holds about 95 percent of the world’s known boxwork, thin blades of calcite in a honeycomb.',
  },
  'petrified-forest': {
    states: ['Arizona'],
    year: 1962,
    since: { year: 1906, as: 'a national monument' },
    fact: 'Its logs turned to stone more than 200 million years ago. It is the only national park with a stretch of historic Route 66.',
  },
  lassen: {
    states: ['California'],
    year: 1916,
    fact: 'All four kinds of volcano are found here: shield, plug dome, cinder cone and composite. Lassen Peak was erupting when the park was made, from 1914 to 1917.',
  },
  'north-cascades': {
    states: ['Washington'],
    year: 1968,
    fact: 'More than 300 glaciers — the most of any US park outside Alaska — on peaks nicknamed the American Alps.',
  },
  'kings-canyon': {
    states: ['California'],
    year: 1940,
    since: { year: 1890, as: 'General Grant National Park' },
    fact: 'In places its canyon is more than 8,000 feet deep, among the deepest in North America. The General Grant Tree is the Nation’s Christmas Tree.',
  },
  katmai: {
    states: ['Alaska'],
    year: 1980,
    since: { year: 1918, as: 'a national monument' },
    fact: 'First protected after the 1912 Novarupta eruption, the largest of the 20th century. Today it is famous for the brown bears that catch salmon at Brooks Falls.',
  },
  'kenai-fjords': {
    states: ['Alaska'],
    year: 1980,
    since: { year: 1978, as: 'a national monument' },
    fact: 'Nearly 40 glaciers flow from the Harding Icefield, and ice covers more than half the park.',
  },
  haleakala: {
    states: ['Hawaii'],
    year: 1961,
    since: { year: 1916, as: 'part of Hawaii National Park' },
    fact: 'Its summit stands 10,023 feet above the sea. The Haleakalā silversword grows nowhere else on Earth.',
  },
  'new-river-gorge': {
    states: ['West Virginia'],
    year: 2020,
    since: { year: 1978, as: 'a national river' },
    fact: 'Despite its name, the New River is one of the oldest rivers on the continent. The bridge across the gorge stands 876 feet above the water, and BASE jumpers leap from it each Bridge Day.',
  },
  'white-sands': {
    states: ['New Mexico'],
    year: 2019,
    since: { year: 1933, as: 'a national monument' },
    fact: 'The largest gypsum dunefield in the world, about 275 square miles of white sand that stays cool underfoot even in summer.',
  },
  pinnacles: {
    states: ['California'],
    year: 2013,
    since: { year: 1908, as: 'a national monument' },
    fact: 'Its spires are the remains of a volcano that erupted about 23 million years ago and has been carried some 195 miles north by the San Andreas Fault. California condors fly here again.',
  },
  redwood: {
    states: ['California'],
    year: 1968,
    fact: 'Home to the tallest trees on Earth, among them Hyperion, about 380 feet tall. The park is run together with three California state parks.',
  },
  'great-basin': {
    states: ['Nevada'],
    year: 1986,
    fact: 'Great Basin bristlecone pines grow here, some nearly 5,000 years old — among the oldest living things on Earth.',
  },
  'black-canyon': {
    states: ['Colorado'],
    year: 1999,
    since: { year: 1933, as: 'a national monument' },
    fact: 'So deep and narrow that parts of the canyon floor see only 33 minutes of sunlight a day. The Painted Wall, 2,250 feet high, is the tallest cliff in Colorado.',
  },
  guadalupe: {
    states: ['Texas'],
    year: 1972,
    fact: 'Guadalupe Peak, 8,751 feet, is the highest point in Texas. The mountains are a fossil reef that grew in an ancient sea about 265 million years ago.',
  },
  'dry-tortugas': {
    states: ['Florida'],
    year: 1992,
    since: { year: 1935, as: 'Fort Jefferson National Monument' },
    fact: 'About 99 percent water, 70 miles west of Key West. Fort Jefferson, built of some 16 million bricks, is the largest all-masonry fort in the Americas.',
  },
  biscayne: {
    states: ['Florida'],
    year: 1980,
    since: { year: 1968, as: 'a national monument' },
    fact: 'About 95 percent of the park is water: coral reef, mangroves and keys. Its Maritime Heritage Trail leads divers to shipwrecks.',
  },
  'channel-islands': {
    states: ['California'],
    year: 1980,
    since: { year: 1938, as: 'a national monument' },
    fact: 'Called the Galápagos of North America: the island fox, smaller than a house cat, lives nowhere else.',
  },
  congaree: {
    states: ['South Carolina'],
    year: 2003,
    since: { year: 1976, as: 'a national monument' },
    fact: 'The largest stretch of old-growth bottomland hardwood forest left in the southeastern US, with some of the tallest trees in eastern North America.',
  },
  cuyahoga: {
    states: ['Ohio'],
    year: 2000,
    since: { year: 1974, as: 'a national recreation area' },
    fact: 'The Cuyahoga River caught fire in 1969, a blaze that helped bring about the Clean Water Act. Bald eagles nest along it again today.',
  },
  'hot-springs': {
    states: ['Arkansas'],
    year: 1921,
    since: { year: 1832, as: 'the Hot Springs Reservation' },
    fact: 'Congress set it aside in 1832, forty years before Yellowstone, making it the oldest area in the National Park System. Its spring water surfaces at about 143°F.',
  },
  'indiana-dunes': {
    states: ['Indiana'],
    year: 2019,
    since: { year: 1966, as: 'a national lakeshore' },
    fact: 'Along 15 miles of Lake Michigan shore, it is one of the most biodiverse national parks, with more than 1,100 native plant species.',
  },
  wrangell: {
    states: ['Alaska'],
    year: 1980,
    since: { year: 1978, as: 'a national monument' },
    fact: 'The largest national park in the US at 13.2 million acres — as big as Yellowstone, Yosemite and Switzerland put together.',
  },
  'gates-of-the-arctic': {
    states: ['Alaska'],
    year: 1980,
    since: { year: 1978, as: 'a national monument' },
    fact: 'The northernmost national park lies wholly north of the Arctic Circle, with no roads or trails at all.',
  },
  'lake-clark': {
    states: ['Alaska'],
    year: 1980,
    since: { year: 1978, as: 'a national monument' },
    fact: 'No road reaches it: visitors fly in. Two active volcanoes, Redoubt and Iliamna, rise above its lakes.',
  },
  'glacier-bay': {
    states: ['Alaska'],
    year: 1980,
    since: { year: 1925, as: 'a national monument' },
    fact: 'When George Vancouver sailed by in 1794 the bay was nearly all ice. Its glaciers have since pulled back more than 65 miles, one of the fastest retreats on record.',
  },
  'kobuk-valley': {
    states: ['Alaska'],
    year: 1980,
    since: { year: 1978, as: 'a national monument' },
    fact: 'Above the Arctic Circle lie the Great Kobuk Sand Dunes, up to 100 feet high, and each year the Western Arctic caribou herd swims the Kobuk River here.',
  },
  'american-samoa': {
    states: ['American Samoa'],
    year: 1988,
    fact: 'The only US national park south of the equator. Its land is leased from Samoan villages rather than owned by the government.',
  },
  'virgin-islands': {
    states: ['U.S. Virgin Islands'],
    year: 1956,
    fact: 'Laurance Rockefeller bought much of St. John and gave it for the park, which covers about 60 percent of the island.',
  },
  'gateway-arch': {
    states: ['Missouri'],
    year: 2018,
    since: { year: 1935, as: 'the Jefferson National Expansion Memorial' },
    fact: 'At 630 feet, the Gateway Arch is the tallest arch in the world and the tallest human-made monument in the Western Hemisphere. On 91 acres, it is also the smallest national park.',
  },
};

export function parkFact(id: string): ParkFact | null {
  return PARK_FACTS[id] ?? null;
}
