import { Feather } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, TextInput, View } from 'react-native';

import type { Id } from '@/core/types';
import { isEmail } from '@/core/validation/rules';
import { usePeople } from '@/data/tasks/queries';
import type { Person } from '@/data/tasks/types';
import { ListRow, SectionLabel, SkeletonRow, Text, useTheme } from '@/shared/ui';

import { Avatar } from './Faces';

/** Typing waits this long before it asks the API (M73). */
const SEARCH_DELAY = 250;

export interface PeoplePickerProps {
  /** Already there (the list's people, the current assignee): left out. */
  exclude?: readonly Id[];
  /** The last row's label for a typed email: "Invite by email" or "Give it by email". */
  emailLabel: string;
  onPickPerson(person: Person): void;
  onEmail(email: string): void;
  /** While the pick saves. */
  busy?: boolean;
}

/**
 * Finding someone instead of typing an email (M73, D89): a search field; empty, the people the user works with most
 * (GET /people); typing searches names, colleagues in a company under Your company. A typed email, or nothing found,
 * ends with the email row. The typed text lives here (docs/performance.md); a pick clears it.
 */
export function PeoplePicker({ exclude = [], emailLabel, onPickPerson, onEmail, busy = false }: PeoplePickerProps) {
  const { t } = useTranslation();
  const { colors, space, type } = useTheme();
  const [text, setText] = useState('');
  const [query, setQuery] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setQuery(text.trim()), SEARCH_DELAY);
    return () => clearTimeout(timer);
  }, [text]);
  const people = usePeople(isEmail(query) ? '' : query);
  const email = text.trim().toLowerCase();
  const typedEmail = isEmail(email);
  const found = (people.data ?? []).filter((p) => !exclude.includes(p.id));
  const known = found.filter((p) => !p.colleague || p.via);
  const colleagues = found.filter((p) => p.colleague && !p.via);

  const pick = (person: Person) => {
    setText('');
    onPickPerson(person);
  };
  const row = (p: Person, last: boolean) => (
    <ListRow
      key={p.id}
      label={p.displayName}
      icon={<Avatar name={p.displayName} seed={p.id} size={24} />}
      value={p.via ?? undefined}
      onPress={() => pick(p)}
      chevron={false}
      busy={busy}
      divider={!last}
    />
  );

  return (
    <View style={{ gap: space.xs }}>
      <View style={[styles.field, { gap: space.sm, borderBottomColor: colors.accent }]}>
        <Feather name="search" size={16} color={colors.ink3} />
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder={t('people.search')}
          placeholderTextColor={colors.ink3}
          selectionColor={colors.accent}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="done"
          onSubmitEditing={() => typedEmail && !busy && onEmail(email)}
          accessibilityLabel={t('people.search')}
          style={[styles.input, { fontFamily: type.body.fontFamily, fontSize: type.body.fontSize, color: colors.ink }]}
        />
      </View>
      {people.isPending ? (
        [60, 45].map((w) => <SkeletonRow key={w} width={w} />)
      ) : (
        <>
          {!!known.length && (
            <View style={{ marginTop: space.sm }}>
              <SectionLabel>{t(query ? 'people.workWith' : 'people.recent')}</SectionLabel>
              {known.map((p, i) => row(p, i === known.length - 1))}
            </View>
          )}
          {!!colleagues.length && (
            <View style={{ marginTop: space.sm }}>
              <SectionLabel>{t('people.company')}</SectionLabel>
              {colleagues.map((p, i) => row(p, i === colleagues.length - 1))}
            </View>
          )}
          {typedEmail ? (
            <ListRow label={emailLabel} value={email} icon={<Feather name="mail" size={18} color={colors.accent} />} onPress={() => onEmail(email)} chevron={false} busy={busy} divider={false} />
          ) : (
            !!query && !found.length && <Text variant="footnote" color="ink3" style={{ marginTop: space.sm }}>{t('people.noneFound')}</Text>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1.5 },
  input: { flex: 1, minHeight: 44, paddingVertical: 10 },
});
