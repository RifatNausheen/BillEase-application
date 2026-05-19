import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@react-navigation/native';
import { StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';

interface FloatingActionButtonProps {
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  style?: ViewStyle;
}

export default function FloatingActionButton({ 
  onPress, 
  icon = 'add',
  style 
}: FloatingActionButtonProps) {
    const {colors} = useTheme();

    const styles = createStyles(colors);
  return (
    <TouchableOpacity 
      style={[styles.fab, style]} 
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Ionicons name={icon} size={28} color={colors.background} />
    </TouchableOpacity>
  );
}

const createStyles = (colors:any) => StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: colors.text,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
});
