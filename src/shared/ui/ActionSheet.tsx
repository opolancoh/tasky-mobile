import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { create } from 'zustand';

import { Sheet } from './Sheet';
import { Text } from './Text';
import { useTheme } from './theme';

export interface ActionChoice {
  label: string;
  /** A Feather name, or `{ community }` for one Feather lacks (sort). */
  icon?: ComponentProps<typeof Feather>['name'] | { community: ComponentProps<typeof MaterialCommunityIcons>['name'] };
  /** Gray, after the label: the current value (Sort · Manual). */
  value?: string;
  /** A check at the end: the current choice in a list of options. */
  selected?: boolean;
  /** A chevron at the end: it opens another menu. */
  more?: boolean;
  /** Red, for actions that remove or leave something. */
  destructive?: boolean;
}

interface Menu {
  title: string;
  actions: ActionChoice[];
  cancelLabel: string;
  resolve(index: number | null): void;
}

const useMenu = create<{ menu: Menu | null; open: boolean }>()(() => ({ menu: null, open: false }));

/** Closes the menu and answers its caller; the sheet keeps the last menu while it animates out. */
function answer(index: number | null) {
  const { menu } = useMenu.getState();
  useMenu.setState({ open: false });
  menu?.resolve(index);
}

/**
 * A menu of actions for one thing (a long press on a row, a ••• button), M64: a sheet from the bottom that fits its
 * rows, the same on iOS and Android. Resolves the index of the chosen action, or null when dismissed. An action may
 * open another menu (Sort): it takes the sheet's place.
 */
export function chooseAction({ title, actions, cancelLabel }: { title: string; actions: ActionChoice[]; cancelLabel: string }): Promise<number | null> {
  return new Promise((resolve) => {
    useMenu.getState().menu?.resolve(null);   // one menu at a time
    useMenu.setState({ menu: { title, actions, cancelLabel, resolve }, open: true });
  });
}

/** Draws `chooseAction`'s menus. Mounted once at the app root, after the other sheets. */
export function ActionSheetHost() {
  const { colors, space } = useTheme();
  const menu = useMenu((s) => s.menu);
  const open = useMenu((s) => s.open);
  if (!menu) return null;
  return (
    <Sheet visible={open} onDismiss={() => answer(null)} dismissLabel={menu.cancelLabel} title={menu.title} size="fit">
      <View style={{ paddingBottom: space.sm }}>
        {menu.actions.map((a, i) => (
          <Pressable
            key={a.label}
            onPress={() => answer(i)}
            accessibilityRole="button"
            accessibilityState={{ selected: a.selected }}
            style={({ pressed }) => [styles.row, { gap: space.md, paddingHorizontal: space.xs, borderTopColor: colors.line, backgroundColor: pressed ? colors.surface2 : 'transparent' }]}
          >
            {a.icon && (
              <View style={styles.icon}>
                {typeof a.icon === 'string'
                  ? <Feather name={a.icon} size={20} color={a.destructive ? colors.danger : colors.ink2} />
                  : <MaterialCommunityIcons name={a.icon.community} size={22} color={colors.ink2} />}
              </View>
            )}
            <Text variant="body" color={a.destructive ? 'danger' : 'ink'} style={styles.label}>{a.label}</Text>
            {a.value && <Text variant="body" color="ink3">{a.value}</Text>}
            {a.selected && <Feather name="check" size={18} color={colors.accent} />}
            {a.more && <Feather name="chevron-right" size={18} color={colors.ink3} />}
          </Pressable>
        ))}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 50, borderTopWidth: StyleSheet.hairlineWidth },
  icon: { width: 24, alignItems: 'center' },   // labels line up whichever set the icon comes from
  label: { flex: 1 },
});
