import * as React from 'react';

import { StyleSheet, View, Text, Button, type TextStyle } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import BottomSheet from 'react-native-scrollable-bottom-sheet';

// Do not forget to wrap your app in GestureHandlerRootView
export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: 'white' }}>
      <ExampleBottomSheet />
    </GestureHandlerRootView>
  );
}

const ExampleBottomSheet = () => {
  const [visible, setVisible] = React.useState<boolean>(false);
  const [contentLength, setContentLength] = React.useState(0);
  const [fullScreenPaddingTop, setFullScreenPaddingTop] = React.useState(0);

  const onVisibilityChange = (visible: boolean) => {
    console.log('Visibility: ' + visible);
    setVisible(visible);
  };
  return (
    <View style={styles.container}>
      <Button
        title="Open Bottom Sheet"
        onPress={() => {
          setFullScreenPaddingTop(0);
          setVisible(true);
        }}
      />
      <View style={{ height: 10 }} />
      <Button
        title="Open Bottom Sheet Reachable"
        onPress={() => {
          setFullScreenPaddingTop(200);
          setVisible(true);
        }}
      />
      <BottomSheet
        onVisibilityChange={onVisibilityChange}
        visible={visible}
        swipeDownThreshold={100}
        fullScreenPaddingTop={fullScreenPaddingTop}
        showScrollbar={false}
        handleStyles={{ backgroundColor: 'blue' }}
        sheetBackgroundContainerStyles={{ borderRadius: 15 }}
      >
        <Text style={headerTextStyle}>Bottom Sheet</Text>
        <Text style={textStyle}>
          Can be swiped down or tap the background to dismiss the sheet
        </Text>
        <View style={{ height: 10 }} />
        <Text style={textStyle}>
          The sheet's size adjusts automatically based on the height of content
          and uses native scrolling within. Try to load more content to see it
          in action!
        </Text>
        <Button
          title="Load more content"
          onPress={() => {
            setContentLength(contentLength + 10);
          }}
        />
        <View style={{ height: 10 }} />
        <Button
          title="Load less content"
          onPress={() => {
            if (contentLength > 0) setContentLength(contentLength - 10);
          }}
        />
        <View style={{ height: 25 }} />
        {Array.from({ length: contentLength }, (_, index) => (
          <View>
            <Text style={textStyle}>{index}</Text>
          </View>
        ))}
        <View style={{ height: 25 }} />
        <Button
          title="Close Sheet"
          onPress={() => {
            setVisible(false);
          }}
        />
        <View style={{ height: 20 }} />
      </BottomSheet>
    </View>
  );
};

const headerTextStyle: TextStyle = {
  textAlign: 'center',
  fontSize: 24,
  fontWeight: 'bold',
  padding: 20,
};

const textStyle: TextStyle = {
  textAlign: 'center',
  fontSize: 20,
  padding: 5,
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
