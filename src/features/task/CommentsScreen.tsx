import { type StaticScreenProps } from '@react-navigation/native';
import { FlashList } from '@shopify/flash-list';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import type { Id } from '@/core/types';
import { useComments } from '@/data/tasks/queries';
import { errorMessage } from '@/shared/i18n/errors';
import { Notice, Screen, SkeletonRow, Text, useTheme } from '@/shared/ui';

import { CommentRow, useCommentMenu } from './components/CommentThread';

/**
 * All of a task's comments (M83): past 60, Task detail's thread opens this. Newest first, 20 more as it scrolls (the same
 * query, so what was loaded stays); a FlashList, so a thousand cost what twenty do. Copy and Delete here; editing and
 * writing stay in Task detail, where the field is.
 */
export function CommentsScreen({ route }: StaticScreenProps<{ taskId: Id }>) {
  const { taskId } = route.params;
  const { t } = useTranslation();
  const { colors, space } = useTheme();
  const comments = useComments(taskId);
  const menu = useCommentMenu(taskId);
  const items = comments.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <Screen edges={['bottom']} contentStyle={styles.fill}>
      <FlashList
        data={items}
        keyExtractor={(c) => c.id}
        renderItem={({ item }) => <CommentRow comment={item} onPress={() => menu(item)} />}
        ListHeaderComponent={<Text variant="title" accessibilityRole="header" style={{ paddingBottom: space.md }}>{t('comments.title')}</Text>}
        ListFooterComponent={
          comments.isPending ? <View>{[70, 50, 60].map((w) => <SkeletonRow key={w} width={w} />)}</View>
          : comments.error ? <Notice>{errorMessage(comments.error)}</Notice>
          : comments.hasNextPage ? <View style={styles.footer}><ActivityIndicator color={colors.ink3} /></View>
          : null
        }
        onEndReached={() => comments.hasNextPage && !comments.isFetchingNextPage && comments.fetchNextPage()}
        onEndReachedThreshold={0.5}
        showsVerticalScrollIndicator={false}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  footer: { minHeight: 56, alignItems: 'center', justifyContent: 'center' },
});
