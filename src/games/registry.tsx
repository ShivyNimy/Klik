import type { ComponentType } from 'react';
import NinetyNineNights from './NinetyNineNights';
import SkyParkour from './SkyParkour';
import CyberDrift from './CyberDrift';
import AstroSurvivors from './AstroSurvivors';
import SnakeArena from './SnakeArena';
import DungeonMerge from './DungeonMerge';
import ZombieSiege from './ZombieSiege';
import TurboHoops from './TurboHoops';
import NeonBreaker from './NeonBreaker';
import CrystalTycoon from './CrystalTycoon';
import ShadowRunner from './ShadowRunner';
import CyberPong from './CyberPong';
import HexaBlocks from './HexaBlocks';
import QuantumMines from './QuantumMines';
import MemoryMatrix from './MemoryMatrix';

export interface GameComponentProps {
  onExit?: () => void;
}

export const GAME_COMPONENTS: Record<string, ComponentType<GameComponentProps>> = {
  '99-nights-in-the-forest': NinetyNineNights,
  'sky-parkour-obby': SkyParkour,
  'cyber-drift-gt': CyberDrift,
  'astro-survivors': AstroSurvivors,
  'slither-arena-io': SnakeArena,
  'dungeon-forge-2048': DungeonMerge,
  'zombie-siege-td': ZombieSiege,
  'turbo-street-hoops': TurboHoops,
  'neon-brick-breaker': NeonBreaker,
  'crystal-mine-tycoon': CrystalTycoon,
  'shadow-katana-runner': ShadowRunner,
  'cyber-pong-duel': CyberPong,
  'hexa-block-blitz': HexaBlocks,
  'quantum-mines': QuantumMines,
  'memory-matrix-pro': MemoryMatrix,
};
