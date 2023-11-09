import { getTransitionSizes, AutoAnimationPlugin } from "@formkit/auto-animate";

export type AutoAnimateOptions = {
  disrespectUserMotionPreference: boolean;
  duration: number;
  easing: string;
};

const defaultOptions: AutoAnimateOptions = {
  disrespectUserMotionPreference: false,
  duration: 300,
  easing: 'cubic-bezier(0.4, 0, 0.2, 1)'
};

export const genericAnimation = (options: AutoAnimateOptions = defaultOptions) => {
  options = {
    ...defaultOptions,
    ...options
  };

  const animation: AutoAnimationPlugin = (el, action, oldCoords, newCoords) => {
    let keyframes: Keyframe[] = [];
    // supply a different set of keyframes for each action
    if (action === 'add') {
      if (!oldCoords) {
        throw new Error('oldCoords must be supplied for action "add"');
      }
      keyframes = [
        { transform: 'scale(0.9)', opacity: 0 },
        { transform: 'scale(1)', opacity: 1 }
      ];
    }
    // keyframes can have as many "steps" as you prefer
    // and you can use the 'offset' key to tune the timing
    if (action === 'remove') {
      if (!oldCoords) {
        throw new Error('oldCoords must be supplied for action "remove"');
      }
      const { top, left, width, height } = el.getBoundingClientRect();
      const bbox = {
        top: top + window.scrollY,
        left: left + window.scrollX,
        width,
        height
      };

      const deltaX = oldCoords.left - bbox.left;
      const deltaY = oldCoords.top - bbox.top;

      const [widthFrom, widthTo, heightFrom, heightTo] = getTransitionSizes(el, oldCoords, bbox);

      const start = { transform: `translate(${deltaX}px, ${deltaY}px)`, width: '', height: '' };
      const end = { transform: 'translate(0, 0)', opacity: 0, width: '', height: '' };

      if (widthFrom !== widthTo) {
        start.width = `${widthFrom}px`;
        end.width = `${widthTo}px`;
      }
      if (heightFrom !== heightTo) {
        start.height = `${heightFrom}px`;
        end.height = `${heightTo}px`;
      }

      keyframes = [start, end];
    }
    if (action === 'remain') {
      if (!oldCoords) {
        throw new Error('oldCoords must be supplied for action "remain"');
      }
      if (!newCoords) {
        throw new Error('newCoords must be supplied for action "remain"');
      }
      // for items that remain, calculate the delta
      // from their old position to their new position
      const deltaX = oldCoords.left - newCoords.left;
      const deltaY = oldCoords.top - newCoords.top;
      // use the getTransitionSizes() helper function to
      // get the old and new widths of the elements
      const [widthFrom, widthTo, heightFrom, heightTo] = getTransitionSizes(el, oldCoords, newCoords);
      // set up our steps with our positioning keyframes
      const start = { transform: `translate(${deltaX}px, ${deltaY}px)`, width: '', height: '' };
      const end = { transform: `translate(0, 0)`, width: '', height: '' };
      // if the dimensions changed, animate them too.
      if (widthFrom !== widthTo) {
        start.width = `${widthFrom}px`;
        end.width = `${widthTo}px`;
      }
      if (heightFrom !== heightTo) {
        start.height = `${heightFrom}px`;
        end.height = `${heightTo}px`;
      }
      keyframes = [start, end];
    }
    // return our KeyframeEffect() and pass
    // it the chosen keyframes.
    return new KeyframeEffect(el, keyframes, options);
  };

  return animation;
};