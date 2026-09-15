export const W = 1280;
export const H = 720;
export const HORIZON = 200;
export const PLAYER_Y = 600;

export const LANES = [-1, 0, 1];

export const LOCATIONS = [
  { name: 'KORAMANGALA', kannada: 'ಕೊರಮಂಗಲ', color: 0x08775f, distance: 300 },
  { name: 'INDIRANAGAR', kannada: 'ಇಂದಿರಾನಗರ', color: 0x0a6888, distance: 650 },
  { name: 'SILK BOARD', kannada: 'ಸಿಲ್ಕ್ ಬೋರ್ಡ್', color: 0x8a2318, distance: 1050, trafficMultiplier: 1.6 },
  { name: 'M.G. ROAD', kannada: 'ಎಂ.ಜಿ. ರಸ್ತೆ', color: 0x224c80, distance: 1500 },
  { name: 'KR PURAM', kannada: 'ಕೆ.ಆರ್. ಪುರಂ', color: 0x6e451b, distance: 2000 },
  { name: 'MARATHAHALLI', kannada: 'ಮಾರತ್ಹಳ್ಳಿ', color: 0x733878, distance: 2550 },
  { name: 'WHITEFIELD', kannada: 'ವೈಟ್‌ಫೀಲ್ಡ್', color: 0x1d664c, distance: 3150 },
  { name: 'TIN FACTORY', kannada: 'ಟಿನ್ ಫ್ಯಾಕ್ಟರಿ', color: 0x8c4320, distance: 3800, trafficMultiplier: 1.5 },
  { name: 'HEBBAL', kannada: 'ಹೆಬ್ಬಾಳ', color: 0x286378, distance: 4500 },
  { name: 'MAJESTIC', kannada: 'ಮೆಜೆಸ್ಟಿಕ್', color: 0x7d2828, distance: 5250 },
  { name: 'HSR LAYOUT', kannada: 'ಹೆಚ್.ಎಸ್.ಆರ್. ಲೇಔಟ್', color: 0x1f7358, distance: 6050 },
  { name: 'ELECTRONIC CITY', kannada: 'ಎಲೆಕ್ಟ್ರಾನಿಕ್ ಸಿಟಿ', color: 0x1f3c78, distance: 7000 }
];

export const VEHICLES = [
  {
    id: 'cab',
    name: 'Namma Cab',
    sub: 'White Indica / Swift',
    kannada: 'ನಮ್ಮ ಕ್ಯಾಬ್',
    price: 0,
    speed: 70,
    handling: 0.18,
    suspension: 3,
    hornType: 'car',
    description: 'The reliable Bangalore workhorse. Well-balanced suspension.'
  },
  {
    id: 'auto',
    name: 'Auto Raja',
    sub: 'King of Bengaluru',
    kannada: 'ಆಟೋ ರಾಜ',
    price: 150,
    speed: 65,
    handling: 0.26,
    suspension: 3,
    hornType: 'auto',
    description: 'Nimble 3-wheeler! Can squeeze through any traffic gap.'
  },
  {
    id: 'scooter',
    name: 'Namma EV',
    sub: 'Electric Scooter',
    kannada: 'ನಮ್ಮ ಇವಿ ಸ್ಕೂಟರ್',
    price: 300,
    speed: 78,
    handling: 0.28,
    suspension: 2,
    hornType: 'scooter',
    description: 'Instant electric acceleration. Watch out for big craters!'
  },
  {
    id: 'bullet',
    name: 'Royal Thumper',
    sub: '350cc Cruiser',
    kannada: 'ರಾಯಲ್ ತಂಪರ್',
    price: 600,
    speed: 75,
    handling: 0.16,
    suspension: 4,
    hornType: 'car',
    description: 'Heavy metal cruiser. Shrugs off potholes with heavy shock absorbers.'
  },
  {
    id: 'bus',
    name: 'BMTC Vajra',
    sub: 'Volvo Green Line',
    kannada: 'ಬಿಎಂಟಿಸಿ ವಜ್ರ',
    price: 1200,
    speed: 82,
    handling: 0.12,
    suspension: 5,
    hornType: 'bus',
    description: 'Unstoppable city giant. High durability against bad roads.'
  }
];

export const BANGALORE_QUIPS = [
  "Swalpa adjust maadi! Next time watch the potholes.",
  "Got stuck in the eternal Silk Board vortex!",
  "Auto driver charged 'won-and-a-half' for suspension repairs.",
  "Wrong-way driver said 'Bro, I'm just taking a shortcut!'",
  "BBMP pothole was deeper than Bangalore tech salaries.",
  "Water tanker did not even look before lane switching!",
  "A tree branch inside the pothole wasn't enough warning?",
  "Sony World signal got the best of you today.",
  "Traffic Police says: 'Helmet elli saar?'",
  "Filter coffee spilt on the dashboard!"
];
