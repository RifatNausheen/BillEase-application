import { DarkTheme, DefaultTheme } from "@react-navigation/native";

export const MyLightTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: "#6750A4",
    secondary: "#625B71",
    tertiary: "#7D5260",
    background: "#FFFFFF",
    muted: "#aeaeae",
    text: "#1C1B1F",
  },
};

export const MyDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: '#ffffffff',
    secondary: "#CCC2DC",
    tertiary: "#EFB8C8",
    background: "#000000",
    muted: "#575757",
    text: "#E6E1E5",
  },
};