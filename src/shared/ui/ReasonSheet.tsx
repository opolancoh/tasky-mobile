import { useRef } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { create } from 'zustand';

import { Sheet } from './Sheet';
import { Text } from './Text';
import { useTheme } from './theme';

export interface AskReasonOptions {
  title: string;
  message?: string;
  /** The action, e.g. "Decline". */
  confirmLabel: string;
  cancelLabel: string;
  /** The field's placeholder, e.g. "Why? (optional)". */
  placeholder: string;
  /** Longest reason accepted. */
  maxLength?: number;
  /** Red, for actions that drop something (declining). */
  destructive?: boolean;
}

interface Ask extends AskReasonOptions {
  resolve(reason: string | null): void;
}

const useAsk = create<{ ask: Ask | null; open: boolean }>()(() => ({ ask: null, open: false }));

/** Closes the sheet and answers its caller; the sheet keeps the last question while it animates out. */
function answer(reason: string | null) {
  const { ask } = useAsk.getState();
  useAsk.setState({ open: false });
  ask?.resolve(reason);
}

/**
 * Asks before an action that takes an optional reason (declining an assignment, M101): a sheet with the message and a
 * field, the same on iOS and Android. Resolves the reason ('' when none), or null when cancelled.
 */
export function askReason(options: AskReasonOptions): Promise<string | null> {
  return new Promise((resolve) => {
    useAsk.getState().ask?.resolve(null);   // one at a time
    useAsk.setState({ ask: { ...options, resolve }, open: true });
  });
}

/** Draws `askReason`'s sheet. Mounted once at the app root, after the other sheets. */
export function ReasonSheetHost() {
  const ask = useAsk((s) => s.ask);
  const open = useAsk((s) => s.open);
  if (!ask) return null;
  return <ReasonSheet key={ask.title + ask.message} ask={ask} open={open} />;
}

function ReasonSheet({ ask, open }: { ask: Ask; open: boolean }) {
  const { colors, radius, space, type } = useTheme();
  // The typed text stays out of React state: nothing re-renders per key (docs/performance.md, rule 2).
  const text = useRef('');
  const { title, message, confirmLabel, cancelLabel, placeholder, maxLength = 500, destructive = true } = ask;
  return (
    <Sheet
      visible={open}
      onDismiss={() => answer(null)}
      dismissLabel={cancelLabel}
      title={title}
      left={{ label: cancelLabel, onPress: () => answer(null) }}
      right={{ label: confirmLabel, emphasis: true, destructive, onPress: () => answer(text.current.trim().slice(0, maxLength)) }}
      size="fit"
    >
      <View style={{ gap: space.md, paddingTop: space.xs, paddingBottom: space.md }}>
        {message && <Text variant="footnote" color="ink2">{message}</Text>}
        {/* A fixed height that scrolls inside: the sheet never grows while typing (M29). */}
        <TextInput
          autoFocus
          multiline
          maxLength={maxLength}
          placeholder={placeholder}
          placeholderTextColor={colors.ink3}
          selectionColor={colors.accent}
          accessibilityLabel={placeholder}
          onChangeText={(v) => { text.current = v; }}
          style={[styles.field, { borderColor: colors.line, borderRadius: radius.md, padding: space.md, fontFamily: type.body.fontFamily, fontSize: type.body.fontSize, color: colors.ink, backgroundColor: colors.bg }]}
        />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  field: { height: 104, borderWidth: StyleSheet.hairlineWidth, textAlignVertical: 'top' },
});
