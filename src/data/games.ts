export type GameCategory =
  | 'All'
  | 'Featured'
  | 'Horror & Survival'
  | 'Action'
  | 'Racing & Sports'
  | 'Arcade & .io'
  | 'Puzzle & Merge'
  | 'Strategy & Idle'
  | '2 Player';

export interface GameItem {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  howToPlay: string[];
  controls: { keys: string; action: string }[];
  categories: GameCategory[];
  thumbnail: string;
  badge?: 'HOT' | 'TOP #1' | 'NEW' | 'POPULAR' | '2P';
  rating: number;
  plays: string;
  developer: string;
  featured?: boolean;
  accentColor: string;
}

export const GAMES: GameItem[] = [
  {
    id: '99-nights-in-the-forest',
    title: '99 Nights in the Forest',
    subtitle: 'Survive the Wendigo, keep the campfire burning & rescue the 4 lost children!',
    description:
      'Step into the chilling dark pine woods in 99 Nights in the Forest! Choose your survivor class—Ranger, Lumberjack, Medic, or Assassin—and brave an escalating survival horror nightmare. Chop wood, forage berries, mine stone, craft spike barricades and automated lanterns during the brief daylight hours. When darkness falls, the ancient antlered Deer Monster (Wendigo) and shadow stalkers emerge from the fog. Keep your central campfire roaring, manage your flashlight battery to stun and repel the beast, and venture deep into the forest shrines to rescue all 4 missing children—each child rescued multiplies your night progression toward Night 99!',
    howToPlay: [
      'Explore the forest during daytime to chop pine trees (Wood), bushes (Berries), stone nodes, and loot crates (Batteries & Scrap).',
      'Return to the Campfire clearing in the center and press [F] to stoke the fire with Wood or cook berries for Hunger & HP.',
      'Open the Crafting Bar ([1]-[4] keys or click icons) to place Spike Traps, Camp Torches, or craft Medkits and Battery Packs.',
      'Hold Right-Click or Spacebar to shine your directional Flashlight beam directly at the Wendigo to burn & repel it—watch your battery!',
      'Follow the compass radar arrows to locate and unlock the 4 Missing Children cages across the deep forest. Each rescued child boosts your Night Multiplier (+1 night per dawn)!',
    ],
    controls: [
      { keys: 'WASD / Arrows', action: 'Move Survivor' },
      { keys: 'Mouse Aim + Left Click', action: 'Swing Axe / Attack / Gather' },
      { keys: 'Space / Right Click', action: 'Toggle / Aim Flashlight Beam' },
      { keys: 'E', action: 'Feed Campfire / Rescue Child' },
      { keys: 'R', action: 'Eat Cooked Ration (+Hunger & HP)' },
      { keys: '1 - 4', action: 'Craft & Build Traps / Torches / Gear' },
    ],
    categories: ['Featured', 'Horror & Survival', 'Action'],
    thumbnail: '/images/99-nights.jpg',
    badge: 'TOP #1',
    rating: 4.9,
    plays: '4.8M',
    developer: 'Klik Originals',
    featured: true,
    accentColor: 'from-amber-500 via-orange-600 to-rose-700',
  },
  {
    id: 'sky-parkour-obby',
    title: 'SkyBlox Parkour Obby',
    subtitle: 'Leap across floating neon platforms, lava blocks & bounce pads in the clouds!',
    description:
      'Race against the clock in this colorful sky-high obstacle course! Master double-jumps, dash boosts, moving platforms, magma hazards, and checkpoint flags across multi-stage sky islands.',
    howToPlay: [
      'Run and jump across floating sky blocks without touching red lava or falling into the void.',
      'Touch glowing green flags to save your checkpoint instantaneously.',
      'Hit cyan bounce pads for super-high vertical launches and reach the Golden Crown!',
    ],
    controls: [
      { keys: 'A / D or Left / Right', action: 'Run Left / Right' },
      { keys: 'W / Up / Space', action: 'Jump & Double Jump' },
      { keys: 'Shift', action: 'Air Dash' },
    ],
    categories: ['Featured', 'Action', 'Arcade & .io'],
    thumbnail: '/images/sky-parkour.jpg',
    badge: 'HOT',
    rating: 4.8,
    plays: '2.9M',
    developer: 'CloudJump Studio',
    featured: true,
    accentColor: 'from-sky-400 to-indigo-600',
  },
  {
    id: 'cyber-drift-gt',
    title: 'Cyber Drift GT',
    subtitle: 'High-octane synthwave street racing with nitro boosts & near-miss combos!',
    description:
      'Weave through futuristic cyberpunk highway traffic at blistering speeds! Chain near-misses for score multipliers, collect plasma cells to charge your Nitro overdrive, and outrun rival street racers.',
    howToPlay: [
      'Steer cleanly between neon traffic lanes as speed escalates.',
      'Pass close to traffic cars for Near-Miss bonus points and Nitro charge.',
      'Hold Space or Up for blazing Nitro Overdrive invulnerability speed!',
    ],
    controls: [
      { keys: 'A / D or Left / Right', action: 'Steer & Drift' },
      { keys: 'W / Space', action: 'Activate Nitro Boost' },
    ],
    categories: ['Featured', 'Racing & Sports', 'Arcade & .io'],
    thumbnail: '/images/cyber-drift.jpg',
    badge: 'POPULAR',
    rating: 4.8,
    plays: '1.9M',
    developer: 'NeonApex',
    featured: true,
    accentColor: 'from-fuchsia-500 to-cyan-500',
  },
  {
    id: 'astro-survivors',
    title: 'Astro Survivors',
    subtitle: 'Bullet-heaven sci-fi roguelike! Auto-blast alien swarms & evolve mega weapons.',
    description:
      'Dropped onto a hostile xenomorph asteroid, your marine auto-fires plasma weapons at hundreds of encroaching alien bugs. Collect XP crystals, level up, and choose roguelike weapon evolutions like Orbital Blades, Chain Lightning, and Nova Cannons!',
    howToPlay: [
      'Move continuously to kite alien swarms while your weapons auto-target nearest foes.',
      'Collect glowing blue & gold XP gems dropped by defeated aliens.',
      'Pick 1 of 3 powerful upgrades every time you level up to become unstoppable!',
    ],
    controls: [
      { keys: 'WASD / Arrow Keys', action: 'Move Marine' },
      { keys: 'Mouse Click', action: 'Select Level-Up Evolution' },
    ],
    categories: ['Featured', 'Action', 'Horror & Survival'],
    thumbnail: '/images/astro-survivors.jpg',
    badge: 'HOT',
    rating: 4.9,
    plays: '3.1M',
    developer: 'StarForge Games',
    featured: true,
    accentColor: 'from-violet-600 to-blue-500',
  },
  {
    id: 'slither-arena-io',
    title: 'Neon Slither.io Arena',
    subtitle: 'Outmaneuver rival cyber-serpents, devour glowing orbs & rule the leaderboard!',
    description:
      'Enter the hexagonal neon grid as a nimble cyber-snake! Eat luminous energy pellets to grow massive, cut off rival AI snakes so they crash into your trail, and feast on their dropped mass to claim the #1 Crown.',
    howToPlay: [
      'Guide your snake smoothly with your mouse cursor or arrow keys.',
      'Hold Click or Space to sprint—watch out, boosting burns a tiny bit of length!',
      'Make other snakes collide head-first into your body to burst them into giant orbs.',
    ],
    controls: [
      { keys: 'Mouse / Left-Right', action: 'Steer Snake' },
      { keys: 'Left Click / Space', action: 'Speed Boost' },
    ],
    categories: ['Featured', 'Arcade & .io'],
    thumbnail: '/images/slither-arena.jpg',
    badge: 'POPULAR',
    rating: 4.7,
    plays: '3.6M',
    developer: 'GridWorks .io',
    accentColor: 'from-emerald-400 to-cyan-500',
  },
  {
    id: 'dungeon-forge-2048',
    title: 'Dungeon Forge Merge',
    subtitle: 'Slide & merge enchanted daggers into Mythic Dragon Blades to slay dungeon bosses!',
    description:
      'A fantasy RPG twist on 2048! Combine matching medieval weapons on the anvil grid—from Rusty Daggers to Iron Swords, Runic Axes, and Celestial Dragon Blades. Every merge deals direct slash damage to dungeon bosses!',
    howToPlay: [
      'Slide tiles in 4 directions to merge identical tier weapons into stronger gear.',
      'Every merge strikes the current Dungeon Boss at the top of the forge.',
      'Slay bosses to earn bonus gold and unlock rare weapon tiers!',
    ],
    controls: [
      { keys: 'WASD / Arrow Keys', action: 'Slide & Merge Forge Grid' },
    ],
    categories: ['Puzzle & Merge', 'Strategy & Idle'],
    thumbnail: '/images/dungeon-merge.jpg',
    badge: 'NEW',
    rating: 4.7,
    plays: '940K',
    developer: 'MythicAnvil',
    accentColor: 'from-amber-500 to-purple-600',
  },
  {
    id: 'zombie-siege-td',
    title: 'Zombie Siege Defense',
    subtitle: 'Build laser turrets, frost coils & plasma cannons to stop the undead horde!',
    description:
      'Command the last highway outpost! Strategically place Pulse Turrets, Cryo Slowers, and Heavy Railguns along tactical pads to vaporize waves of mutated zombies before they breach your bunker.',
    howToPlay: [
      'Select a turret blueprint at the bottom bar and click any empty tactical pad to build.',
      'Click existing turrets to upgrade their range, fire-rate, and damage.',
      'Survive escalating zombie & boss waves to earn top commander rank!',
    ],
    controls: [
      { keys: 'Mouse Left Click', action: 'Build & Upgrade Turrets' },
      { keys: '1 / 2 / 3', action: 'Select Turret Blueprint' },
    ],
    categories: ['Strategy & Idle', 'Horror & Survival'],
    thumbnail: '/images/zombie-siege.jpg',
    badge: 'POPULAR',
    rating: 4.8,
    plays: '1.5M',
    developer: 'Outpost Interactive',
    accentColor: 'from-lime-500 to-emerald-700',
  },
  {
    id: 'turbo-street-hoops',
    title: 'Turbo Street Hoops',
    subtitle: 'Sink flaming swishes, chain backboard trick shots & trigger On-Fire mode!',
    description:
      'Step onto the neon rooftop court! Drag and aim physics-based arc shots into moving and elevated hoops. Sink consecutive nothing-but-net swishes to ignite your ball in flames for 3x points!',
    howToPlay: [
      'Click and drag anywhere on the court to aim the trajectory arc.',
      'Release to shoot! Clean swishes without touching the rim multiply your streak.',
      'Beat the shot clock and rack up a legendary streetball high score!',
    ],
    controls: [
      { keys: 'Mouse Drag & Release', action: 'Aim Arc & Shoot Ball' },
    ],
    categories: ['Racing & Sports', 'Arcade & .io'],
    thumbnail: '/images/turbo-hoops.jpg',
    rating: 4.6,
    plays: '1.1M',
    developer: 'CourtKings',
    accentColor: 'from-orange-500 to-red-600',
  },
  {
    id: 'neon-brick-breaker',
    title: 'Neon Prism Breaker',
    subtitle: 'Smash glowing crystal bricks with multi-ball lasers & synthwave powerups!',
    description:
      'Classic arcade brick-breaking supercharged with neon particle physics, multi-ball chaos, wide-paddle shields, and explosive prism blocks.',
    howToPlay: [
      'Move your energy paddle to deflect the plasma ball into crystal bricks.',
      'Catch falling powerup capsules for Multi-Ball, Wide Paddle, and Bonus Score!',
      'Clear every crystal wall to advance to faster stages.',
    ],
    controls: [
      { keys: 'Mouse / Left-Right Arrows', action: 'Move Energy Paddle' },
      { keys: 'Space / Click', action: 'Launch Plasma Ball' },
    ],
    categories: ['Arcade & .io', 'Puzzle & Merge'],
    thumbnail: '/images/neon-breaker.jpg',
    rating: 4.6,
    plays: '880K',
    developer: 'PrismArcade',
    accentColor: 'from-pink-500 to-violet-600',
  },
  {
    id: 'crystal-mine-tycoon',
    title: 'Crystal Mine Tycoon',
    subtitle: 'Tap enchanted gems, hire goblin drills & build an automated crystal empire!',
    description:
      'Strike it rich inside a glowing cavern! Mine magic crystals with critical strikes, invest in Quantum Drills, Arcane Golems, and Portal Refineries, and unlock prestige multipliers.',
    howToPlay: [
      'Click the giant enchanted crystal for instant gem bursts and critical combos.',
      'Purchase automated miners and upgrades on the right panel to skyrocket Gems/sec.',
      'Catch golden floating meteors for huge frenzy bonuses!',
    ],
    controls: [
      { keys: 'Mouse Left Click / Space', action: 'Mine Crystal & Buy Upgrades' },
    ],
    categories: ['Strategy & Idle'],
    thumbnail: '/images/clicker-tycoon.jpg',
    badge: 'NEW',
    rating: 4.7,
    plays: '1.3M',
    developer: 'IdleRealms',
    accentColor: 'from-purple-500 to-amber-500',
  },
  {
    id: 'shadow-katana-runner',
    title: 'Shadow Katana Runner',
    subtitle: 'Slash cyber-drones & leap across neon Tokyo rooftops under a blood moon!',
    description:
      'Sprint across endless cyberpunk rooftops as an agile shinobi! Double-jump over skyscraper gaps, slice incoming security drones in mid-air with your katana, and set a blistering distance record.',
    howToPlay: [
      'Jump between rooftops of varying heights and avoid falling between buildings.',
      'Press X / Click / Enter to unleash a Katana Slash that destroys red drones for bonus score!',
    ],
    controls: [
      { keys: 'W / Up / Space', action: 'Jump & Double Jump' },
      { keys: 'X / Left Click', action: 'Katana Dash Slash' },
    ],
    categories: ['Action', 'Arcade & .io'],
    thumbnail: '/images/shadow-ninja.svg',
    rating: 4.7,
    plays: '790K',
    developer: 'RoninByte',
    accentColor: 'from-rose-500 to-teal-400',
  },
  {
    id: 'cyber-pong-duel',
    title: 'Cyber Pong Duel (1P / 2P)',
    subtitle: 'Challenge a friend on one keyboard or duel the Cyber AI in plasma table tennis!',
    description:
      'Play solo against an adaptive Cyber AI or grab a friend for local 2-Player keyboard duels! Curve shots with paddle momentum, trigger speed rallies, and race to 7 points.',
    howToPlay: [
      'Toggle between 1-Player vs AI or 2-Player Local Mode at any time.',
      'Deflect the plasma orb past your opponent—each volley increases ball velocity!',
    ],
    controls: [
      { keys: 'W / S', action: 'Player 1 Paddle (Left)' },
      { keys: 'Up / Down Arrows', action: 'Player 2 Paddle (Right)' },
    ],
    categories: ['2 Player', 'Racing & Sports', 'Arcade & .io'],
    thumbnail: '/images/cyber-pong.svg',
    badge: '2P',
    rating: 4.8,
    plays: '1.2M',
    developer: 'Klik Arena',
    accentColor: 'from-cyan-400 to-rose-500',
  },
  {
    id: 'hexa-block-blitz',
    title: 'Neon Block Blitz',
    subtitle: 'Rotate, hard-drop & clear glowing tetromino lines in high-speed arcade style!',
    description:
      'Test your spatial reflexes in Neon Block Blitz! Preview upcoming tetrominoes, line up ghost-piece hard drops, clear 4-line Quad Blitzes, and climb through hyper-speed levels.',
    howToPlay: [
      'Move and rotate falling neon blocks to fill complete horizontal rows.',
      'Press Space for an instant Hard Drop onto the ghost outline for extra points!',
    ],
    controls: [
      { keys: 'Left / Right Arrows', action: 'Move Piece' },
      { keys: 'Up / W', action: 'Rotate Piece' },
      { keys: 'Down / S', action: 'Soft Drop' },
      { keys: 'Space', action: 'Instant Hard Drop' },
    ],
    categories: ['Puzzle & Merge', 'Arcade & .io'],
    thumbnail: '/images/hexa-blocks.svg',
    rating: 4.8,
    plays: '1.6M',
    developer: 'TetroPulse',
    accentColor: 'from-purple-500 to-pink-500',
  },
  {
    id: 'quantum-mines',
    title: 'Quantum Minesweeper',
    subtitle: 'Deduce hidden plasma mines, plant warning flags & clear the tactical grid!',
    description:
      'A sleek modern Minesweeper built for speed and clarity! Enjoy guaranteed safe first clicks, chord-reveal shortcuts, difficulty presets, and crisp tactical audio.',
    howToPlay: [
      'Left-click any tile to scan it—your first click is always 100% safe.',
      'Numbers show how many adjacent mines touch that tile (out of 8 neighbors).',
      'Right-click (or toggle Flag Mode) to mark suspected plasma mines!',
    ],
    controls: [
      { keys: 'Left Click', action: 'Reveal Tile' },
      { keys: 'Right Click / F', action: 'Place / Remove Flag' },
    ],
    categories: ['Puzzle & Merge', 'Strategy & Idle'],
    thumbnail: '/images/mines-sweeper.svg',
    rating: 4.6,
    plays: '670K',
    developer: 'LogicCore',
    accentColor: 'from-teal-400 to-sky-500',
  },
  {
    id: 'memory-matrix-pro',
    title: 'Holo Memory Matrix',
    subtitle: 'Match holographic cyber-glyphs in minimal moves to build mega combo streaks!',
    description:
      'Sharpen your memory across glowing holo-cards! Flip pairs, chain consecutive matches without mistakes for huge combo multipliers, and beat your fastest clear time.',
    howToPlay: [
      'Click two holo-cards to flip and inspect their neon symbols.',
      'Match identical pairs back-to-back to multiply your combo bonus!',
    ],
    controls: [
      { keys: 'Mouse Left Click', action: 'Flip Holo-Card' },
    ],
    categories: ['Puzzle & Merge', '2 Player'],
    thumbnail: '/images/memory-matrix.svg',
    rating: 4.5,
    plays: '530K',
    developer: 'MindGrid',
    accentColor: 'from-indigo-500 to-pink-500',
  },
];
