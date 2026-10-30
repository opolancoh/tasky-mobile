import { Feather } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, TextInput, View } from 'react-native';

import { shortenEmail } from '@/core/text/shorten';
import type { Id } from '@/core/types';
import { isEmail } from '@/core/validation/rules';
import { SEARCH_DELAY } from '@/core/text/searchDelay';
import { usePeople } from '@/data/tasks/queries';
import { isEmailAssignee, type MembersOf, type Person } from '@/data/tasks/types';
import { ListRow, SectionLabel, SkeletonRow, Spinner, Text, useTheme } from '@/shared/ui';

import { Avatar } from './Faces';

/** About two lines of the row's detail; a longer email is cut in the middle, keeping its domain. */
const EMAIL_MAX = 60;

export interface PeoplePickerProps {
  /** Already there (the current assignee): left out. */
  exclude?: readonly Id[];
  /** A list or team whose people the API leaves out (D105): the app needn't load them all. */
  within?: MembersOf;
  /** The last row's label for a typed email: "Invite by email" or "Give it by email". */
  emailLabel: string;
  /** The field clears on a pick; `restore` puts the text back if it's still empty (a cancel or an error), and says if it did. */
  onPickPerson(person: Person, restore: () => boolean): void;
  onEmail(email: string, restore: () => boolean): void;
  /** While the pick saves. */
  busy?: boolean;
  /** Return sends the typed email and the keyboard stays up for the next one (People › Invite, M116). */
  keepsKeyboard?: boolean;
}

/**
 * Finding someone instead of typing an email (M73, D89): a search field; empty, the people the user works with most
 * (GET /people); typing searches names, colleagues in a company under Your company. A typed email is searched too: someone you
 * know with that address comes first, then the email row; otherwise the email row is right under the field (D104); a small ring spins in the field while a search request is out (M73, M121). The typed text lives here
 * (docs/performance.md); a pick or an email sent clears it.
 */
export function PeoplePicker({ exclude = [], within, emailLabel, onPickPerson, onEmail, busy = false, keepsKeyboard = false }: PeoplePickerProps) {
  const { t } = useTranslation();
  const { colors, space, type } = useTheme();
  const [text, setText] = useState('');
  const latest = useRef('');
  const change = (value: string) => {
    latest.current = value;
    setText(value);
  };
  const [query, setQuery] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setQuery(text.trim()), SEARCH_DELAY);
    return () => clearTimeout(timer);
  }, [text]);
  // An email is searched too: someone you know with that address shows above Invite by email (D104). The API leaves out `exclude`.
  const people = usePeople(query, exclude.filter((id) => !isEmailAssignee(id)), within);   // an emailed assignee isn't a user id
  // Searching: from a keystroke until its results are in (the wait before asking, then the request); the last results stay meanwhile.
  // As every search field: the ring only while a request is out, not through the pause after typing.
  const searching = people.isFetching && !people.isPending;
  const email = text.trim().toLowerCase();
  const typedEmail = isEmail(email);
  const found = people.data ?? [];
  const known = found.filter((p) => !p.colleague || p.via);
  const colleagues = found.filter((p) => p.colleague && !p.via);

  const restoring = (typed: string) => () => {
    if (latest.current) return false;
    change(typed);
    return true;
  };
  const pick = (person: Person) => {
    change('');
    onPickPerson(person, restoring(text));
  };
  const sendEmail = () => {
    change('');
    onEmail(email, restoring(text));
  };
  const row = (p: Person, last: boolean) => (
    <ListRow
      key={p.id}
      label={p.displayName}
      icon={<Avatar name={p.displayName} seed={p.id} size={24} />}
      onPress={() => pick(p)}
      chevron={false}
      busy={busy}
      divider={!last}
    />
  );

  const emailRow = (
    <ListRow label={emailLabel} detail={shortenEmail(email, EMAIL_MAX)} icon={<Feather name="mail" size={18} color={colors.accent} />} onPress={sendEmail} chevron={false} busy={busy} divider={false} accessibilityLabel={`${emailLabel}, ${email}`} />
  );

  return (
    <View style={{ gap: space.xs }}>
      <View style={[styles.field, { gap: space.sm, borderBottomColor: colors.accent }]}>
        <Feather name="search" size={16} color={colors.ink3} />
        <TextInput
          value={text}
          onChangeText={change}
          placeholder={t('people.search')}
          placeholderTextColor={colors.ink3}
          selectionColor={colors.accent}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType={keepsKeyboard ? 'send' : 'done'}
          submitBehavior={keepsKeyboard ? 'submit' : 'blurAndSubmit'}
          onSubmitEditing={() => typedEmail && !busy && sendEmail()}
          accessibilityLabel={t('people.search')}
          style={[styles.input, { fontFamily: type.body.fontFamily, fontSize: type.body.fontSize, color: colors.ink }]}
        />
        {searching && <Spinner size={16} accessibilityLabel={t('people.searching')} />}
      </View>
      {/* A typed email: its row right under the field (M73), or under someone you know with that address (D104). */}
      {typedEmail && !found.length && emailRow}
      {people.isPending ? (
        [60, 45].map((w) => <SkeletonRow key={w} width={w} />)
      ) : (
        <>
          {/* A section only with people in it (hidden when empty); SectionLabel brings its space above. */}
          {!!known.length && (
            <View>
              <SectionLabel>{t(query ? 'people.workWith' : 'people.recent')}</SectionLabel>
              {known.map((p, i) => row(p, i === known.length - 1))}
            </View>
          )}
          {!!colleagues.length && (
            <View>
              <SectionLabel>{t('people.company')}</SectionLabel>
              {colleagues.map((p, i) => row(p, i === colleagues.length - 1))}
            </View>
          )}
          {typedEmail && !!found.length && emailRow}
          {!typedEmail && !!query && !found.length && <Text variant="footnote" color="ink3" style={{ marginTop: space.sm }}>{t('people.noneFound')}</Text>}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1.5 },
  input: { flex: 1, minHeight: 44, paddingVertical: 10 },
});
