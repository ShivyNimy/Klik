import { assetUrl } from '../utils/assets';

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
  badge?: 'EDITOR PICK' | 'ORIGINAL' | '2P';
  featured?: boolean;
  accentColor: string;
}

export const GAMES: GameItem[] = [
  {
    id: '99-nights-in-the-forest',
    title: '99 Nights in the Forest',
    subtitle: 'Survive the Wendigo, keep the campfire burning & rescue the 4 lost children!',
    description:
      'Survive an escalating night-and-day cycle in a dark pine forest. Gather wood, berries, stone, batteries, and scrap; keep the central campfire fueled; and craft spike traps, torches, medkits, and battery packs. At night the Wendigo and shadow stalkers emerge. Use the flashlight to repel the Wendigo, rescue four children from cages around the forest, and advance toward Night 99. Each rescued child adds two extra nights to each dawn advance.',
    howToPlay: [
      'Explore during the day to chop pine trees for Wood, forage Berries, mine Stone, and search crates for Batteries and Scrap.',
      'Return to the central Campfire and press [E] to feed it Wood. Press [R] to eat a ration and restore Hunger and HP.',
      'Use the Crafting Bar ([1]-[4] keys or click icons) to place Spike Traps and Camp Torches, or craft Medkits and Battery Packs.',
      'Press Space to toggle the flashlight or hold Right-Click to aim its beam at the Wendigo—watch your battery!',
      'Follow the compass to find the four child cages. Each rescued child adds two extra nights to every dawn advance.',
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
    thumbnail: assetUrl('images/99-nights.jpg'),
    badge: 'ORIGINAL',
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
      { keys: 'Shift / X', action: 'Air Dash' },
    ],
    categories: ['Featured', 'Action', 'Arcade & .io'],
    thumbnail: assetUrl('images/sky-parkour.jpg'),
    badge: 'EDITOR PICK',
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
      { keys: 'W / Up / Space / Shift', action: 'Activate Nitro Boost' },
    ],
    categories: ['Featured', 'Racing & Sports', 'Arcade & .io'],
    thumbnail: assetUrl('images/cyber-drift.jpg'),
    badge: 'EDITOR PICK',
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
    thumbnail: assetUrl('images/astro-survivors.jpg'),
    badge: 'EDITOR PICK',
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
      'Guide your snake with the mouse or your finger on a touch screen.',
      'Hold the mouse button or touch the screen to sprint—boosting slowly uses some length.',
      'Make other snakes collide head-first into your body to burst them into giant orbs.',
    ],
    controls: [
      { keys: 'Mouse / Touch', action: 'Steer Snake' },
      { keys: 'Hold Mouse / Touch', action: 'Speed Boost' },
    ],
    categories: ['Featured', 'Arcade & .io'],
    thumbnail: assetUrl('images/slither-arena.jpg'),
    badge: 'EDITOR PICK',
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
    thumbnail: assetUrl('images/dungeon-merge.jpg'),
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
    thumbnail: assetUrl('images/zombie-siege.jpg'),
    badge: 'EDITOR PICK',
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
    thumbnail: assetUrl('images/turbo-hoops.jpg'),
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
      'Catch falling powerup capsules for Multi-Ball, a Wide Paddle, or an Extra Life!',
      'Clear every crystal wall to advance to faster stages.',
    ],
    controls: [
      { keys: 'Mouse / Left-Right Arrows', action: 'Move Energy Paddle' },
      { keys: 'Space / Click', action: 'Launch Plasma Ball' },
    ],
    categories: ['Arcade & .io', 'Puzzle & Merge'],
    thumbnail: assetUrl('images/neon-breaker.jpg'),
    accentColor: 'from-pink-500 to-violet-600',
  },
  {
    id: 'crystal-mine-tycoon',
    title: 'Crystal Mine Tycoon',
    subtitle: 'Tap enchanted gems, hire goblin drills & build an automated crystal empire!',
    description:
      'Strike it rich inside a glowing cavern! Mine magic crystals, upgrade your click power, and invest in goblin crews, arcane golems, quantum drills, and other generators to grow your passive gem income.',
    howToPlay: [
      'Click the giant enchanted crystal for instant gem bursts and critical combos.',
      'Purchase automated miners and upgrades on the right panel to skyrocket Gems/sec.',
      'Catch golden floating meteors for huge frenzy bonuses!',
    ],
    controls: [
      { keys: 'Mouse / Touch', action: 'Mine Crystal & use the upgrade buttons' },
    ],
    categories: ['Strategy & Idle'],
    thumbnail: assetUrl('images/clicker-tycoon.jpg'),
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
      { keys: 'X / J / Enter / Left Click', action: 'Katana Dash Slash' },
    ],
    categories: ['Action', 'Arcade & .io'],
    thumbnail: assetUrl('images/shadow-ninja.svg'),
    accentColor: 'from-rose-500 to-teal-400',
  },
  {
    id: 'cyber-pong-duel',
    title: 'Cyber Pong Duel (1P / 2P)',
    subtitle: 'Challenge a friend on one keyboard or play the built-in Cyber AI in plasma table tennis!',
    description:
      'Play solo against the built-in AI or grab a friend for local 2-player keyboard duels. Curve shots with paddle momentum, trigger speed rallies, and race to 7 points.',
    howToPlay: [
      'Toggle between 1-Player vs AI or 2-Player Local Mode at any time.',
      'Deflect the plasma orb past your opponent—each volley increases ball velocity!',
    ],
    controls: [
      { keys: 'W / S', action: 'Player 1 Paddle (Left)' },
      { keys: 'Up / Down Arrows', action: 'Player 2 Paddle (Right)' },
    ],
    categories: ['2 Player', 'Racing & Sports', 'Arcade & .io'],
    thumbnail: assetUrl('images/cyber-pong.svg'),
    badge: '2P',
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
    thumbnail: assetUrl('images/hexa-blocks.svg'),
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
      'Right-click, press F, or toggle Flag Mode to mark suspected plasma mines!',
    ],
    controls: [
      { keys: 'Left Click', action: 'Reveal Tile' },
      { keys: 'Right Click / F', action: 'Place / Remove Flag' },
    ],
    categories: ['Puzzle & Merge', 'Strategy & Idle'],
    thumbnail: assetUrl('images/mines-sweeper.svg'),
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
    categories: ['Puzzle & Merge'],
    thumbnail: assetUrl('images/memory-matrix.svg'),
    accentColor: 'from-indigo-500 to-pink-500',
  },
];
