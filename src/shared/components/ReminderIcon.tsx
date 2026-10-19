import { Ionicons } from '@expo/vector-icons';

/** A reminder's mark everywhere (the hub's alarm clock): Feather has none, so Ionicons' outline one, the same weight. */
export function ReminderIcon({ size = 20, color }: { size?: number; color: string }) {
  return <Ionicons name="alarm-outline" size={size} color={color} />;
}
