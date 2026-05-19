import { useSearch } from "@/context/useSearch";
import { hexToRGBA } from "@/utils/misc";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "@react-navigation/native";
import { Tabs, usePathname, useRouter } from "expo-router";
import { StyleSheet, TextInput, TouchableOpacity, View } from "react-native";

export default function TabLayout() {
  const router = useRouter();

  const { colors } = useTheme();
  const styles = createStyles(colors);

  const pathname = usePathname();

  const { searchQuery, setSearchQuery } = useSearch();

  const getPlaceholder = () => {
    if (pathname.includes("bills")) return "Search by client or date...";
    if (pathname.includes("products")) return "Search by product name...";
    if (pathname.includes("clients")) return "Search by name or phone...";
    if (pathname.includes("presets")) return "Search by preset name...";
    return "Search...";
  };

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
  };

  const handleClearSearch = () => {
    setSearchQuery("");
  };

  return (
    <Tabs
      screenListeners={{ tabPress: handleClearSearch }}
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.background,
        },
        header: () => (
          <View style={styles.header}>
            <View style={styles.searchContainer}>
              <Ionicons
                name="search"
                size={20}
                color="#8E8E93"
                style={styles.searchIcon}
              />
              <TextInput
                style={styles.searchInput}
                placeholder={getPlaceholder()}
                placeholderTextColor="#8E8E93"
                value={searchQuery}
                onChangeText={handleSearchChange}
                returnKeyType="search"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity
                  onPress={handleClearSearch}
                  style={styles.clearButton}
                >
                  <Ionicons name="close-circle" size={18} color="#8E8E93" />
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity
              style={styles.avatar}
              onPress={() => router.push("/profile")}
            >
              <Ionicons
                name="person-circle-outline"
                size={40}
                color={colors.primary}
              />
            </TouchableOpacity>
          </View>
        ),
      }}
    >
      <Tabs.Screen
        name="bills"
        options={{
          title: "Bills",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="receipt-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="products"
        options={{
          title: "Products",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="cube-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="clients"
        options={{
          title: "Clients",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="presets"
        options={{
          title: "Presets",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name="receipt-text-edit-outline"
              size={size}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}

const createStyles = (colors: any) => {
  return StyleSheet.create({
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingTop: 50,
      paddingBottom: 10,
      backgroundColor: colors.background,
      borderBottomWidth: 1,
      borderBottomColor: hexToRGBA(colors.text, 0.15),
    },
    searchContainer: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      alignContent: "center",
      // backgroundColor: '#F2F2F7',
      backgroundColor: hexToRGBA(colors.text, 0.1),
      borderRadius: 10,
      paddingHorizontal: 12,
      height: 40,
      marginRight: 12,
    },
    searchIcon: {
      marginRight: 8,
    },
    searchInput: {
      flex: 1,
      color: colors.text,
    },
    clearButton: {
      padding: 4,
    },
    avatar: {
      width: 40,
      height: 40,
      justifyContent: "center",
      alignItems: "center",
    },
  });
};
