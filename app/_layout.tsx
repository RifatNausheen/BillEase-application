import { SearchProvider } from "@/context/useSearch";
import { MyDarkTheme, MyLightTheme } from "@/utils/theme";
import { ThemeProvider } from "@react-navigation/native";
import { Stack } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, useColorScheme, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { initDatabase } from "../utils/database";

export default function RootLayout() {
  const [dbReady, setDbReady] = useState(false);

  const colorScheme = useColorScheme();

  useEffect(() => {
    // Initialize database on app start
    const setupDatabase = async () => {
      try {
        await initDatabase();
        setDbReady(true);
        console.log("Database setup complete");
      } catch (error) {
        console.error("Failed to initialize database:", error);
      }
    };

    setupDatabase();
  }, []);

  if (!dbReady) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SearchProvider>
        <ThemeProvider
          value={colorScheme === "dark" ? MyDarkTheme : MyLightTheme}
        >
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen
              name="profile"
              options={{
                presentation: "card",
                animation: "slide_from_right",
              }}
            />
            <Stack.Screen
              name="create-bill"
              options={{
                presentation: "card",
                animation: "slide_from_right",
              }}
            />
            <Stack.Screen
              name="view-bill"
              options={{
                presentation: "card",
                animation: "slide_from_right",
              }}
            />
          </Stack>
        </ThemeProvider>
      </SearchProvider>
    </GestureHandlerRootView>
  );
}
