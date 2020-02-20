// This function is meant to be executed in the app global context
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(window as any).responsiveBgImageHandler = function(event: Event): void {
  const target = event.currentTarget as HTMLImageElement;
  // We created the child before adding the handler to it, so we are sure it exists
  // We traverse the <picture> tag transparently
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const parent = target.parentElement!.parentElement!;
  const currentSrc = new URL(target.currentSrc).pathname;

  parent.style.backgroundImage = `url(${currentSrc})`;
};
