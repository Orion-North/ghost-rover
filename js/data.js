/* =====================================================================
   GHOST ROVERS · STORY DATA
   This is the file to edit if you want to rewrite the stories.
   Every fact should be double-checked against NASA sources before judging.
   Positions are real landing-site coordinates (degrees, north + and east +).

   Each machine has:
     wow   : one short fun fact shown big at the top of its card
     story : the machine introduces itself (first person)
     found : "What I discovered"
     now   : "Where I am now"
     eng   : "Engineering secret"
   ===================================================================== */
const WORLDS = {
  moon: {
    label: "The Moon", short: "Moon", lonMin: -45, lonMax: 45, latMin: -35, latMax: 40, ppd: 120, wrap: false,
    kmPerDeg: 30.3, maxV: 300, gravity: 120, start: [5, 0],
    labels: [
      ["Sea of Tranquility", 8.5, 31.4], ["Sea of Serenity", 28, 17.5], ["Sea of Rains", 32.8, -15.6],
      ["Copernicus Crater", 9.6, -20.1], ["Sea of Clouds", -21.3, -16.6], ["Ocean of Storms", -1, -38],
      ["Apennine Mountains", 19.9, -3.7]
    ],
    sites: [
      { id: "a11", type: "descent", lat: 0.674, lon: 23.473,
        kicker: "Apollo 11 · 1969", name: "Eagle's Descent Stage", where: "Sea of Tranquility, the Moon",
        wow: "I was a launch pad on the Moon!",
        story: "I'm the bottom half of the lunar module Eagle. On July 20, 1969, I carried Neil Armstrong and Buzz Aldrin down to the Moon. When it was time to go home, the top half blasted off and used me as its launch pad. I stayed behind.",
        found: "The crew set up a laser mirror next to me. Scientists on Earth still bounce laser beams off it and time the trip. That's how we know the Moon drifts about 3.8 cm farther from Earth every year.",
        now: "Still standing where I landed. A plaque on my leg says: \"We came in peace for all mankind.\"",
        eng: "My rocket engine could be throttled up and down, so Armstrong could slow down and hover. He flew past a field of boulders and landed with very little fuel to spare." },
      { id: "s3", type: "surveyor", lat: -3.015, lon: -23.418,
        kicker: "Surveyor 3 · 1967", name: "Surveyor 3", where: "Ocean of Storms, the Moon",
        wow: "I bounced on the Moon. Twice!",
        story: "I'm a robot lander, and I reached the Moon two years before any astronaut. My job was to find out if the ground was safe for people. When I touched down in April 1967, my engines didn't shut off in time, so I bounced. Twice!",
        found: "I dug little trenches with my scoop and sent home thousands of photos. The soil was firm enough to hold a spacecraft, which told engineers that astronauts could land and walk safely.",
        now: "In November 1969, Apollo 12 landed close by, and Pete Conrad and Alan Bean walked over to visit me. They cut off my camera and took it home so scientists could study what the Moon had done to it.",
        eng: "I had no pilot. A radar on my belly measured how fast I was falling, and my computer adjusted my engines by itself." },
      { id: "a15", type: "buggy", lat: 26.132, lon: 3.634,
        kicker: "Apollo 15 · 1971", name: "The First Moon Car", where: "Hadley Rille, the Moon",
        wow: "I flew to the Moon folded up like a lawn chair!",
        story: "I'm the first car ever driven on another world. I traveled to the Moon folded up like a lawn chair, strapped to the side of the lander. In July 1971, Dave Scott and Jim Irwin unfolded me and drove me almost 28 km across hills and craters.",
        found: "Driving meant the crew could reach places far from the lander. They picked up the \"Genesis Rock,\" a white rock more than 4 billion years old, left over from the Moon's early crust.",
        now: "Parked where my crew left me. Cameras orbiting the Moon have photographed my tire tracks from space.",
        eng: "I ran on two batteries, every wheel had its own electric motor, and my tires were woven from wire mesh, because air-filled tires could pop." },
      { id: "a17", type: "buggy", patched: true, lat: 20.191, lon: 30.772,
        kicker: "Apollo 17 · 1972", name: "The Last Moon Car", where: "Taurus-Littrow Valley, the Moon",
        wow: "Astronauts fixed me with duct tape and maps!",
        story: "I carried the last astronauts to walk on the Moon, Gene Cernan and Harrison Schmitt, in December 1972. Schmitt was a geologist, the first scientist to explore the Moon in person.",
        found: "Schmitt spotted soil that was bright orange! It was made of tiny glass beads sprayed out by volcanic fire fountains more than 3.5 billion years ago. The Moon once had volcanoes.",
        now: "My TV camera filmed the crew blasting off for home. I've been parked in this valley ever since, waiting for visitors.",
        eng: "One of my fenders broke off and moon dust sprayed everywhere. The astronauts fixed it with duct tape, clamps and folded paper maps. It worked!" }
    ],
    // Science stars: little facts to collect on the way. [lat, lon, fact]
    stars: [
      [4, 7, "The Moon's gravity is about one-sixth of Earth's. That's why your rover floats so long after a bump!"],
      [2, 15, "There's no air on the Moon, so there's no wind. Dust kicked up by wheels falls straight back down."],
      [13, 1.5, "With no air, sound can't travel on the Moon. A real rover here would be silent. (We added sounds for fun.)"],
      [20, 3, "The Moon is about 384,400 km from Earth on average. Light makes the trip in about 1.3 seconds."],
      [22, 17, "Twelve astronauts walked on the Moon between 1969 and 1972."],
      [10, 27, "The Moon's dark patches are called \"seas,\" but they're really plains of ancient lava."],
      [2, -9, "The same side of the Moon always faces Earth. From here, Earth never rises or sets. It just hangs in the sky."],
      [-1, -17, "One day on the Moon, from sunrise to sunrise, lasts about 29.5 Earth days."],
      [9.6, -20.1, "You're at Copernicus Crater! It's about 93 km wide, and you can spot it from Earth with binoculars."],
      [-10, 12, "Apollo astronauts brought home 382 kg of Moon rocks and soil. Scientists still study them today."]
    ]
  },
  mars: {
    label: "Mars", short: "Mars", lonMin: -180, lonMax: 180, latMin: -35, latMax: 78, ppd: 60, wrap: true,
    kmPerDeg: 59.3, maxV: 340, gravity: 275, start: [12, -60],
    labels: [
      ["Olympus Mons", 18.65, -133.8], ["Valles Marineris", -13.9, -59.2], ["Gale Crater", -5.4, 137.8],
      ["Chryse Planitia", 28.4, -40], ["Utopia Planitia", 46.7, 117.5], ["Elysium Mons", 25.0, 147.2],
      ["Meridiani Planum", 3, 0], ["Vastitas Borealis", 72, -100], ["Jezero Crater", 21, 77.6], ["Gusev Crater", -11, 175.4]
    ],
    sites: [
      { id: "v1", type: "viking", lat: 22.27, lon: -47.95,
        kicker: "Viking 1 · 1976", name: "Viking 1 Lander", where: "Chryse Planitia, Mars",
        wow: "I landed exactly 7 years after Apollo 11!",
        story: "I was the first NASA spacecraft to land safely on Mars, on July 20, 1976. That's exactly seven years after Apollo 11 landed on the Moon.",
        found: "I sent home the first clear photos from the surface of Mars. My robot arm scooped soil into tiny labs inside me to test for life. The results were confusing, and scientists still argue about them.",
        now: "I worked for more than six years, until November 1982. In 2006, a camera orbiting Mars spotted me sitting quietly on the plains.",
        eng: "Radio signals take several minutes to travel between Earth and Mars, so nobody could steer me down. I was built to land and work on my own." },
      { id: "soj", type: "mini", lat: 19.13, lon: -33.22,
        kicker: "Mars Pathfinder · 1997", name: "Sojourner", where: "Ares Vallis, Mars",
        wow: "I'm only as big as a microwave oven!",
        story: "I'm Sojourner, the first rover on Mars. I'm about the size of a microwave oven. In July 1997, my lander bounced onto Mars wrapped in giant airbags, then opened up like a flower to let me out.",
        found: "I drove up to rocks the team nicknamed Barnacle Bill and Yogi and studied what they were made of. Many rocks around me had been carried here by huge ancient floods.",
        now: "My mission was planned for 7 days. I lasted 83. Contact with my lander ended in September 1997, and I'm still parked nearby.",
        eng: "My wheels sat on a rocker-bogie suspension that lets a rover climb over rocks without tipping. NASA's Mars rovers still use that design today." },
      { id: "opp", type: "rover", lat: -1.95, lon: -5.53,
        kicker: "Mars Exploration Rover · 2004", name: "Opportunity", where: "Meridiani Planum, Mars",
        wow: "Built for 90 days. I lasted almost 15 years!",
        story: "My plan was 90 Martian days and about 1 km of driving. Instead I explored for almost 15 years and drove more than 45 km, a record for driving off Earth when I stopped.",
        found: "Right where I landed, I found tiny gray balls the team nicknamed \"blueberries.\" They're made of hematite, a mineral that usually forms in water. Mars was once wet!",
        now: "In 2018, a dust storm covered the whole planet and blocked sunlight from my solar panels. My last message came on June 10, 2018. My team sent more than 1,000 commands trying to wake me.",
        eng: "I ran on sunlight. Dust kept settling on my solar panels, but gusts of Martian wind sometimes blew them clean. Those lucky gusts helped me last so long." },
      { id: "ing", type: "heli", lat: 18.45, lon: 77.45,
        kicker: "Ingenuity · 2021", name: "Ingenuity", where: "Jezero Crater, Mars",
        wow: "I flew 72 times on another planet!",
        story: "I'm a helicopter that weighs only 1.8 kg. I rode to Mars tucked under the belly of the Perseverance rover.",
        found: "On April 19, 2021, I made the first powered, controlled flight on another planet. Mars' air is about 1% as thick as Earth's, so my blades had to spin about 2,400 times a minute to lift me.",
        now: "I was supposed to make 5 test flights. I made 72. On my last flight in January 2024 my rotor blades were damaged, and I can't fly anymore.",
        eng: "I flew myself, using a camera pointed at the ground to track how I was moving." },
      { id: "ins", type: "insight", lat: 4.50, lon: 135.62,
        kicker: "InSight · 2018", name: "InSight", where: "Elysium Planitia, Mars",
        wow: "I felt more than 1,300 marsquakes!",
        story: "I landed in November 2018. I don't drive. I listen. I was built to feel Mars shake.",
        found: "My seismometer recorded more than 1,300 marsquakes. By studying how quake waves traveled through the planet, scientists measured Mars' core and found it's liquid metal.",
        now: "Dust slowly covered my solar panels until I couldn't make enough power. My last message arrived in December 2022.",
        eng: "My heat probe, nicknamed \"the mole,\" was supposed to hammer 5 m into the ground. The soil was too clumpy and it got stuck near the surface. Engineers learn from failures too." },
      { id: "spi", type: "rover", lat: -14.57, lon: 175.47,
        kicker: "Mars Exploration Rover · 2004", name: "Spirit", where: "Gusev Crater, Mars",
        wow: "My broken wheel made a discovery!",
        story: "My twin Opportunity and I landed three weeks apart in January 2004, on opposite sides of Mars. We were each built for 90 days. I kept going for six years.",
        found: "When one of my six wheels broke, I drove backward and dragged it. That stuck wheel scraped up bright white soil that was almost pure silica. On Earth, soil like that forms around hot springs and steam vents, places where tiny living things can survive.",
        now: "In 2009 I got stuck in soft sand at a spot called Troy. My team tried for months to free me. My last message came in March 2010.",
        eng: "I carried a rock grinder on my robot arm so I could scrape off a rock's dusty outside and look at the fresh rock underneath." },
      { id: "phx", type: "phoenix", lat: 68.22, lon: -125.75,
        kicker: "Phoenix · 2008", name: "Phoenix", where: "Arctic plains, Mars",
        wow: "I touched water ice on Mars!",
        story: "I landed in May 2008 on the icy arctic plains of Mars. I don't drive. I dig.",
        found: "I scraped a trench with my robot arm and found bright white chunks. A few days later they had vanished, turning straight into gas. That proved it was water ice, hiding just under the dirt.",
        now: "Winter came and carbon dioxide frost covered me. My last signal came in November 2008. Photos taken from orbit later showed my solar panels had been damaged.",
        eng: "I came down on rocket thrusters instead of airbags and set myself down gently on three legs." }
    ],
    stars: [
      [16, -55, "Mars is red because its dust is full of iron oxide. That's rust!"],
      [20, -41, "A day on Mars is called a sol. It's about 40 minutes longer than a day on Earth."],
      [-13.9, -59.2, "You're at Valles Marineris, a canyon system long enough to stretch across the whole United States."],
      [9, -20, "Mars' gravity is about 38% of Earth's. You could jump almost three times higher here."],
      [8, 35, "One year on Mars lasts 687 Earth days, almost two Earth years."],
      [14, 58, "Mars has two small moons, Phobos and Deimos."],
      [15, 71, "Not every Mars robot is a ghost. The Perseverance rover has been exploring Jezero Crater since 2021."],
      [10, 106, "Sunsets on Mars look blue, because of the fine dust floating in its thin air."],
      [-5.4, 137.8, "You're at Gale Crater, where the Curiosity rover has been exploring since 2012."],
      [-6, 157, "The air on Mars is mostly carbon dioxide, and far too thin for people to breathe."],
      [18.65, -133.8, "You're at Olympus Mons, the biggest volcano in the solar system, about three times as tall as Mount Everest."],
      [45, -128, "Mars is cold! The average temperature is about -65°C."]
    ]
  }
};

const WORLD_DONE = {
  moon: { type: "trophy", kicker: "Moon complete", name: "Every Moon ghost found!",
    where: "Mars is about 225 million km away on average",
    wow: "You found all four Moon machines!",
    story: "Some of them carried people. Some went first to make sure people would be safe. Now let's visit the robots that explore Mars on their own, far too far away for anyone to drive them with a joystick.",
    found: "", now: "", eng: "" },
  mars: { type: "trophy", kicker: "Mars complete", name: "Every Mars ghost found!", where: "",
    wow: "You found all seven Mars machines!",
    story: "Each one answered a question and left new ones for the next mission.",
    found: "", now: "", eng: "" }
};

const EPILOGUE = {
  id: "voy", type: "probe", kicker: "Voyager 1 · launched 1977", name: "One more: still talking",
  where: "Interstellar space, beyond the planets",
  wow: "A message from me takes a whole day to reach Earth!",
  story: "Not every machine we sent is resting. I flew past Jupiter and Saturn and kept going. In 2012 I became the first spacecraft to reach interstellar space. On November 18, 2026, I'm expected to be one light-day from Earth: a radio message from me takes a whole day to get home.",
  found: "Before I left the solar system, I measured the bubble the Sun blows around itself and what lies beyond it.",
  now: "My power is slowly running out, so my team turns off instruments one at a time to keep me talking as long as possible.",
  eng: "I carry a golden record with sounds and pictures of Earth, in case anyone ever finds me."
};

const ROVER_COLORS = [
  ["Cherry", "#ff4d5e"], ["Tangerine", "#ff9a2e"], ["Sunny", "#ffd23f"],
  ["Lime", "#58d66a"], ["Sky", "#3fb6ff"], ["Grape", "#a970ff"], ["Bubblegum", "#ff7ac8"]
];
