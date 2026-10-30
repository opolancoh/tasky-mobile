import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { isApiError } from '@/core/http/problem';
import { copyErrorDetails, detailRows, useDetailsAllowed } from '@/shared/network/errorDetails';
import { Text, TextButton, useTheme } from '@/shared/ui';

/** Details under a failure to reach Azignia (M119), for support and admin: a quiet link that opens what failed, and Copy. */
export function ErrorDetails({ error }: { error: unknown }) {
  const { t } = useTranslation();
  const { colors, radius, space } = useTheme();
  const allowed = useDetailsAllowed();
  const [open, setOpen] = useState(false);
  if (!allowed || !isApiError(error)) return null;

  return (
    <View style={{ gap: space.xs, alignSelf: 'stretch' }}>
      <View style={{ alignSelf: 'flex-start' }}>
        <TextButton label={t(open ? 'errorDetails.hide' : 'errorDetails.title')} onPress={() => setOpen(!open)} />
      </View>
      {open && (
        <>
          <View style={[styles.box, { backgroundColor: colors.surface2, borderColor: colors.line, borderRadius: radius.md, padding: space.md, gap: space.xxs }]}>
            {detailRows(error).map(([label, value]) => (
              <View key={label} style={[styles.row, { gap: space.sm }]}>
                <Text variant="footnote" color="ink2">{label}</Text>
                <Text variant="footnote" selectable style={styles.value}>{value}</Text>
              </View>
            ))}
          </View>
          <View style={{ alignSelf: 'flex-start' }}>
            <TextButton label={t('errorDetails.copy')} onPress={() => void copyErrorDetails(error)} />
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { borderWidth: StyleSheet.hairlineWidth },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  value: { flexShrink: 1, textAlign: 'right' },
});
