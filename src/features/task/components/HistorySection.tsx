import { useNavigation } from '@react-navigation/native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import type { Id } from '@/core/types';
import { INLINE_MAX, useHistory } from '@/data/tasks/queries';
import { errorMessage } from '@/shared/i18n/errors';
import { Button, Notice, Text, useTheme } from '@/shared/ui';

import { HistoryRow } from './HistoryRow';

/**
 * Task history (D94, M83, the hub's D): **Show history** under the closing lines; nothing is asked for until it's tapped.
 * Then the last 20 changes, **Show more** 20 at a time, and past 60 **See all history** on its own screen (a FlashList).
 */
export function HistorySection({ taskId }: { taskId: Id }) {
  const { t } = useTranslation();
  const { colors, space } = useTheme();
  const navigation = useNavigation();
  const [shown, setShown] = useState(false);
  const history = useHistory(taskId, shown);
  const items = history.data?.pages.flatMap((p) => p.items) ?? [];

  if (!shown) {
    return (
      <View style={[styles.start, { marginTop: space.md }]}>
        <Button variant="link" title={t('history.show')} onPress={() => setShown(true)} />
      </View>
    );
  }
  return (
    <View style={{ marginTop: space.md, gap: space.xxs }}>
      <Text variant="label" color="ink2" accessibilityRole="header">{t('history.title')}</Text>
      {history.isPending ? (
        <View style={[styles.loading, { gap: space.sm }]}>
          <ActivityIndicator size="small" color={colors.ink3} />
          <Text variant="footnote" color="ink3">{t('history.loading')}</Text>
        </View>
      ) : history.error ? (
        <Notice>{errorMessage(history.error)}</Notice>
      ) : (
        <>
          {!items.length && <Text variant="footnote" color="ink3">{t('history.none')}</Text>}
          {/* At most 60 here, inside Task detail's scroll; more on their own screen. */}
          {items.map((h) => <HistoryRow key={h.id} entry={h} />)}
          {history.hasNextPage && (
            <View style={styles.start}>
              {items.length >= INLINE_MAX
                ? <Button variant="link" title={t('history.seeAll')} onPress={() => navigation.navigate('TaskHistory', { taskId })} />
                : <Button variant="link" title={t('history.more')} onPress={() => history.fetchNextPage()} disabled={history.isFetchingNextPage} />}
            </View>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  start: { alignItems: 'flex-start' },
  loading: { flexDirection: 'row', alignItems: 'center', minHeight: 32 },
});
