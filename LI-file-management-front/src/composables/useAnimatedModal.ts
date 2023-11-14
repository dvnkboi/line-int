import { onClickOutside } from "@vueuse/core";
import { Ref, ref, onMounted } from "vue";
import { EventEmitter } from "../utils/events";

const defaultOptions = {
  width: '100%' as string | number,
  height: '100%' as string | number,
  closeOnClickOutside: true,
};


function getTransitionDuration(el: HTMLElement, with_delay: boolean) {
  const style = window.getComputedStyle(el);
  const duration = style.transitionDuration;
  const delay = style.transitionDelay;
  if (with_delay) return (((duration.indexOf("ms") > -1) ? parseFloat(duration) : parseFloat(duration) * 1000) + ((delay.indexOf("ms") > -1) ? parseFloat(delay) : parseFloat(delay) * 1000));
  else return ((duration.indexOf("ms") > -1) ? parseFloat(duration) : parseFloat(duration) * 1000);
}


export type useAnimatedModalReturn = {
  focus: () => void;
  unfocus: () => void;
  isFocused: Ref<boolean>;
  isFocusedPremature: Ref<boolean>;
  on: (event: 'focus' | 'unfocus' | 'focusPremature' | 'unfocusPremature', callback: () => void, key?: string) => void;
  off: (event: 'focus' | 'unfocus' | 'focusPremature' | 'unfocusPremature', callback: (() => void) | string) => void;
  once: (event: 'focus' | 'unfocus' | 'focusPremature' | 'unfocusPremature', callback: () => void, key?: string) => void;
};


export const useAnimatedModal = (container: Ref<HTMLElement>, immitationContainer: Ref<HTMLElement>, options: Partial<typeof defaultOptions> = defaultOptions) => {
  const eventEmitter = new EventEmitter();

  options = {
    ...defaultOptions,
    ...options,
  };

  const isFocused = ref(false);
  const isFocusedPremature = ref(false);


  if (options.closeOnClickOutside) {
    onClickOutside(container, () => {
      if (isFocused.value) {
        unfocus();
      }
    });
  }

  const dimensions = {
    width: 0,
    height: 0,
  };

  const transitionDuration = ref(0);

  onMounted(() => {
    transitionDuration.value = getTransitionDuration(container.value, true);
    if (!immitationContainer.value) {
      transitionDuration.value = 500;
    }
  });



  const focus = () => {
    if (isFocused.value) return;
    if (!container.value) return;
    const pos = container.value.getBoundingClientRect();
    const topBarBoundingBox = {
      height: 0,
    };

    const relativePos = {
      top: pos.top - topBarBoundingBox.height,
      left: pos.left,
      height: pos.height,
      width: pos.width,
    };

    immitationContainer.value.style.flexShrink = '0';
    immitationContainer.value.style.height = `${pos.height}px`;
    immitationContainer.value.style.width = `${pos.width}px`;
    dimensions.width = pos.width;
    dimensions.height = pos.height;

    // position in middle of container's parent
    container.value.style.top = `${relativePos.top}px`;
    container.value.style.left = `${relativePos.left}px`;
    container.value.style.height = `${dimensions.height}px`;
    container.value.style.width = `${dimensions.width}px`;
    container.value.style.zIndex = '100';
    container.value.style.transform = 'translate(0%, 0%)';
    container.value.style.position = 'fixed';
    isFocusedPremature.value = true;
    eventEmitter.emit('focusPremature');

    setTimeout(() => {
      setTimeout(() => {
        container.value.style.transform = 'translate(-50%, -50%)';
      }, 10);

      container.value.style.top = '50%';
      container.value.style.left = '50%';
      container.value.style.height = `${typeof options.height == 'number' ? `${options.height}px` : options.height}`;
      container.value.style.width = `${typeof options.width == 'number' ? `${options.width}px` : options.width}`;
      isFocused.value = true;
      eventEmitter.emit('focus');
    }, 20);
  };

  const unfocus = () => {
    if (!immitationContainer.value) return;
    const pos = immitationContainer.value.getBoundingClientRect();
    const topBarBoundingBox = {
      height: 0,
    };

    const relativePos = {
      top: pos.top - topBarBoundingBox.height,
      left: pos.left,
      height: pos.height,
      width: pos.width,
    };

    container.value.style.top = `${relativePos.top}px`;
    container.value.style.left = `${relativePos.left}px`;
    container.value.style.transform = 'translate(0%, 0%)';
    container.value.style.height = `${dimensions.height}px`;
    container.value.style.width = `${dimensions.width}px`;
    isFocusedPremature.value = false;
    eventEmitter.emit('unfocusPremature');

    setTimeout(() => {
      container.value.style.transform = 'translate(0%, 0%) scale(1)';
      setTimeout(() => {
        container.value.style.height = 'auto';
        container.value.style.width = 'auto';
        container.value.style.zIndex = 'auto';
        container.value.style.top = 'auto';
        container.value.style.left = 'auto';
        container.value.style.position = 'relative';
        immitationContainer.value.style.height = '';
        immitationContainer.value.style.width = '';
        isFocused.value = false;
        eventEmitter.emit('unfocus');
        container.value.style.transform = '';
      }, transitionDuration.value + 10);
    }, 20);
  };

  const on = (event: 'focus' | 'unfocus' | 'focusPremature' | 'unfocusPremature', callback: () => void, key?: string) => {
    eventEmitter.on(event, callback, key);
  };

  const off = (event: 'focus' | 'unfocus' | 'focusPremature' | 'unfocusPremature', callback: (() => void) | string) => {
    eventEmitter.off(event, callback);
  };

  const once = (event: 'focus' | 'unfocus' | 'focusPremature' | 'unfocusPremature', callback: () => void, key?: string) => {
    eventEmitter.once(event, callback, key);
  };

  return {
    focus,
    unfocus,
    isFocused,
    isFocusedPremature,
    on,
    off,
    once,
  };
};