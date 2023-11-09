export const listAnimationFix = (el: Element) => {
  const html = <HTMLElement>el;
  const { marginLeft, marginTop, width, height } = window.getComputedStyle(el);
  html.style.left = `${html.offsetLeft - parseFloat(marginLeft)}px`;
  html.style.top = `${html.offsetTop - parseFloat(marginTop)}px`;
  html.style.width = width;
  html.style.height = height;
};

export default listAnimationFix;