import React, {
  createRef,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { Dimensions, StyleSheet, TouchableOpacity, View } from 'react-native';
import {
  PanGestureHandler,
  ScrollView,
  State,
} from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  runOnJS,
  withTiming,
  SlideInDown,
  SlideOutDown,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';

// const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

interface BottomSheetProps {
  /**
   * Indicates whether the bottom sheet is currently visible or not.
   */
  visible: boolean;

  /**
   * A callback function that gets invoked when the visibility of the bottom sheet changes.
   * This will only change when the bottom sheet updates its state, not when visible prop is changed by the parent
   */
  onVisibilityChange: ((visible: boolean) => void) | undefined;

  /**
   * Additional padding from the top of the total height when in fully expanded.
   * Can be used to make things easier to reach.
   * Defaults to 0
   */
  fullScreenPaddingTop?: any;

  /**
   * The content to be displayed inside the bottom sheet.
   */
  children?: any;

  /**
   * The threshold (in pixels) that triggers the swipe down gesture to close the bottom sheet.
   * If the user does not swipe this far down, the sheet will snap back to the expanded state.
   * Defaults to 50
   */
  swipeDownThreshold?: number;

  /**
   * Show the scrollbar or not. Defaults to false.
   */
  showScrollbar?: boolean;

  /**
   * If enabled, the dragging down of the bottom sheet will animate the opacity of the backdrop
   * May create flicker of the background if a darker overlay is used and this is enabled when the sheet is dismissed
   */
  animateBackdropOpacityWithDrag?: boolean;

  /**
   * The interactive height area of the sheet. It is recommended to keep this undefined.
   * By default it is Dimensions.get('window').height
   * To decrease the expanded height of the sheet, use the `fullScreenPaddingTop` prop
   */
  interactiveMaxHeight?: number;

  /**
   * Hide the handle for the bottom sheet container
   */
  hideHandle?: boolean;

  /**
   * Styles for the handle element
   */
  handleStyles?: any;

  /**
   * Hide the background and container for the entire bottom sheet. This also hides the handle.
   */
  hideSheetBackgroundContainer?: boolean;

  /**
   * Styles for the container of the bottom sheet
   */
  sheetBackgroundContainerStyles?: any;

  /**
   * The mass used for the closing/opening animation of the sheet
   */
  customSheetMass?: number;
  /**
   * The damping used for the closing/opening animation of the sheet
   */
  customSheetDamping?: number;

  /**
   * Defaults to enabled.
   * Use reanimated entering and exiting animations instead of legacy animated values
   * This can introduce errors with Tab.Navigator and unmounting if enabled.
   * For example, if the navigator is popped and the exiting animation is played
   * if the component is unmounted, it will cause the UI to become blank and
   * unresponsive.
   * More traditional animation values will be used if this is disabled, however
   * lazy loading can no longer be used as the component will always be
   * rendered, just below off screen.
   */
  useEnteringAndExitingAnimations?: boolean;
}

const BottomSheet = (props: BottomSheetProps) => {
  const [isOpen, setOpen] = useState(props.visible);
  const panRef = createRef();
  const scrollViewRef: React.RefObject<ScrollView> = useRef(null);
  const height = props.interactiveMaxHeight ?? Dimensions.get('window').height;
  const offset = useSharedValue(height);

  // If the user is allowed to close the sheet
  // Set to true when the user is scrolled back to the top of the content
  let canClose = true;
  // If the user already started closing the sheet, i.e. started dragging down
  // but they are scrolling, don't allow closing (canClose = false)
  let startedClosing = false;
  // The initial drag point when the user first swipes to dismiss
  // Used to calculate the delta swiped
  let startY = 0;

  const closeSheet = useCallback(
    (updateOnChange: boolean) => {
      if (props.useEnteringAndExitingAnimations === false) {
        offset.value = withSpring(height, {
          damping: props.customSheetDamping ?? 400,
          mass: props.customSheetMass ?? 0.4,
        });
      } else {
        offset.value = 0;
        setOpen(false);
      }
      if (updateOnChange && props?.onVisibilityChange !== undefined) {
        props.onVisibilityChange(false);
      }
    },
    [props, offset, height]
  );

  const openSheet = useCallback(
    (updateOnChange: boolean) => {
      if (props.useEnteringAndExitingAnimations === false) {
        offset.value = withSpring(0, {
          damping: props.customSheetDamping ?? 400,
          mass: props.customSheetMass ?? 0.4,
        });
        scrollViewRef.current?.scrollTo({
          y: 0,
          animated: false,
        });
      } else {
        offset.value = 0;
        setOpen(true);
      }
      if (updateOnChange && props?.onVisibilityChange !== undefined) {
        props.onVisibilityChange(true);
      }
    },
    [props, offset]
  );

  useEffect(() => {
    if (props.visible) {
      openSheet(false);
    } else {
      closeSheet(false);
    }
  }, [props.visible, openSheet, closeSheet]);

  const translateY = useAnimatedStyle(() => ({
    transform: [{ translateY: offset.value }],
  }));

  const opacity = useAnimatedStyle(() => ({
    opacity: 1 - offset.value / height,
  }));

  const onScroll = (event: {
    nativeEvent: { contentOffset: { y: number } };
  }) => {
    if (props.useEnteringAndExitingAnimations === false) {
      if (event.nativeEvent.contentOffset.y <= 5) {
        canClose = true;
      } else if (event.nativeEvent.contentOffset.y >= 5) {
        canClose = false;
      } else {
        if (startedClosing === false) {
          canClose = false;
        }
      }
    } else {
      if (event.nativeEvent.contentOffset.y <= 5 && offset.value <= 5) {
        canClose = true;
      } else {
        if (startedClosing === false) {
          canClose = false;
        }
      }
    }
  };

  const handlePanGestureEvent = (event: { nativeEvent: { y: number } }) => {
    if (canClose) {
      startedClosing = true;
      if (startY === 0) {
        startY = event.nativeEvent.y;
      }
      const offsetDelta = (startY - event.nativeEvent.y) * -1 + offset.value;
      offset.value = offsetDelta > 0 ? offsetDelta : 0;
    }
  };

  const handlePanGestureEnd = () => {
    startedClosing = false;
    if (offset.value < (props?.swipeDownThreshold ?? 50)) {
      // Snap back to open
      offset.value = withSpring(0, { damping: 100 });
      canClose = true;
    } else {
      // Closed sheet
      closeSheet(true);
      offset.value = withTiming(height, {}, () => {
        runOnJS(closeSheet)(false);
      });
    }
  };

  const handlePanGestureStart = () => {
    // Set to 0 to indicate scrolling has started
    startY = 0;
  };

  return (
    <>
      {(isOpen || props.useEnteringAndExitingAnimations === false) && (
        <>
          <Animated.View
            style={[
              styles.backdrop,
              ...(props.animateBackdropOpacityWithDrag === true ||
              props.useEnteringAndExitingAnimations === false
                ? [opacity]
                : [{ opacity: 0 }]),
            ]}
            pointerEvents="none"
            entering={
              props.useEnteringAndExitingAnimations === false
                ? undefined
                : FadeIn
            }
            exiting={
              props.useEnteringAndExitingAnimations === false
                ? undefined
                : props.animateBackdropOpacityWithDrag === true
                ? undefined
                : FadeOut
            }
          />
          <PanGestureHandler
            onGestureEvent={handlePanGestureEvent}
            onHandlerStateChange={({ nativeEvent }) => {
              if (nativeEvent.state === State.END) {
                handlePanGestureEnd();
              } else if (nativeEvent.state === State.BEGAN) {
                handlePanGestureStart();
              }
            }}
            ref={panRef}
          >
            <Animated.View
              style={[styles.sheet, { height: height }, translateY]}
              entering={
                props.useEnteringAndExitingAnimations === false
                  ? undefined
                  : SlideInDown.springify()
                      .mass(props.customSheetMass ?? 0.4)
                      .damping(props.customSheetDamping ?? 100)
              }
              exiting={
                props.useEnteringAndExitingAnimations === false
                  ? undefined
                  : SlideOutDown.springify()
                      .mass(props.customSheetMass ?? 0.4)
                      .damping(props.customSheetDamping ?? 100)
              }
            >
              <ScrollView
                ref={scrollViewRef}
                onScroll={onScroll}
                scrollEventThrottle={16}
                simultaneousHandlers={[panRef]}
                contentContainerStyle={{
                  flexGrow: 1,
                  justifyContent: 'space-between',
                  flexDirection: 'column',
                }}
                showsVerticalScrollIndicator={props.showScrollbar ?? false}
                showsHorizontalScrollIndicator={props.showScrollbar ?? false}
              >
                <TouchableOpacity
                  onPress={() => {
                    closeSheet(true);
                  }}
                  style={{
                    flexGrow: 1,
                    paddingTop: props?.fullScreenPaddingTop ?? 0,
                  }}
                />
                <View style={{ justifyContent: 'flex-end' }}>
                  {props.hideSheetBackgroundContainer === true ? (
                    <>{props.children}</>
                  ) : (
                    <BottomSheetContainer
                      styles={props.sheetBackgroundContainerStyles}
                    >
                      {props.hideHandle === true ? (
                        <></>
                      ) : (
                        <BottomSheetHandle styles={props.handleStyles} />
                      )}
                      {props.children}
                    </BottomSheetContainer>
                  )}
                </View>
              </ScrollView>
            </Animated.View>
          </PanGestureHandler>
        </>
      )}
    </>
  );
};

const BottomSheetContainer = (props: { children?: any; styles?: any }) => {
  return (
    <View style={[styles.bottomSheetContainer, props.styles]}>
      {props.children}
    </View>
  );
};

const BottomSheetHandle = (props: { styles?: any }) => {
  return (
    <View style={{ width: '100%', alignItems: 'center', paddingTop: 10 }}>
      <View style={[styles.handle, props.styles]} />
    </View>
  );
};

const styles = StyleSheet.create({
  handle: {
    backgroundColor: 'gray',
    height: 5,
    width: 40,
    borderRadius: 50,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#00000054',
    zIndex: 9998,
  },
  bottomSheetContainer: {
    borderRadius: 20,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    backgroundColor: 'white',
  },
  sheet: {
    backgroundColor: 'transparent',
    width: '100%',
    position: 'absolute',
    bottom: 0,
    zIndex: 9999,
  },
});

export default BottomSheet;
