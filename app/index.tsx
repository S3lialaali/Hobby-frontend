import { Redirect } from "expo-router";

export default function Index() {
  // Use relative path to redirect to login screen upon first opening app
  return <Redirect href="./screens/login" />;
}

