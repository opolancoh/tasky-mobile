import { StackActions, useNavigation } from '@react-navigation/native';
import * as Clipboard from 'expo-clipboard';
import { useLayoutEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { parseJoinLink } from '@/core/links';
import { Button, Screen, Text, TextButton, TextField, useTheme } from '@/shared/ui';

/**
 * Join with a link (D95, M84), from Spaces' Teams: paste the invite link someone sent, or type its code; Next opens
 * "Join …?". The way in where a tap on the link can't open the app (Expo Go, a desktop browser).
 */
export function JoinPasteScreen() {
  const { t } = useTranslation();
  const { space } = useTheme();
  const navigation = useNavigation();
  const [text, setText] = useState('');
  const [left, setLeft] = useState(false);
  const link = parseJoinLink(text);

  const next = () => link && navigation.dispatch(StackActions.replace('JoinLink', link));
  useLayoutEffect(() => {
    navigation.setOptions({ headerRight: () => <TextButton label={t('join.next')} onPress={next} disabled={!link} /> });
  });

  return (
    <Screen scroll edges={['bottom']}>
      <View style={{ gap: space.md, paddingTop: space.md }}>
        <Text variant="title" accessibilityRole="header">{t('join.pasteTitle')}</Text>
        <Text variant="body" color="ink2">{t('join.pasteBody')}</Text>
        <TextField
          label={t('join.linkLabel')}
          value={text}
          onChangeText={setText}
          onBlur={() => setLeft(true)}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="go"
          onSubmitEditing={next}
          error={left && text.trim() && !link ? t('join.notALink') : undefined}
        />
        <View style={{ alignItems: 'flex-start' }}>
          <Button variant="link" title={t('join.pasteFromClipboard')} onPress={async () => setText(await Clipboard.getStringAsync())} />
        </View>
      </View>
    </Screen>
  );
}
