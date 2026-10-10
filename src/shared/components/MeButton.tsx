import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet } from 'react-native';

import { useMe } from '@/data/tenancy/queries';

import { Avatar } from './Faces';

/** The user's avatar at the top right of Today and Activity (M39): opens Me (profile, settings, sign out). */
export function MeButton() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const me = useMe().data;
  if (!me) return null;
  return (
    <Pressable onPress={() => navigation.navigate('Me')} accessibilityRole="button" accessibilityLabel={t('me.open')} hitSlop={6} style={styles.button}>
      <Avatar name={me.displayName} seed={me.id} size={34} />
    </Pressable>
  );
}

const styles = StyleSheet.create({ button: { minWidth: 44, minHeight: 44, alignItems: 'flex-end', justifyContent: 'center' } });
