const WHATSAPP_NUMBER = "919992196879";
const MESSAGE = "Hi! I'd like to know more about MakeGlowOver.";

export function WhatsAppFloatButton() {
  return (
    <a
      href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(MESSAGE)}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with us on WhatsApp"
      className="group fixed right-5 bottom-5 z-50 flex size-14 items-center justify-center rounded-full bg-[#25D366] shadow-lg transition-transform hover:scale-110"
    >
      <span
        aria-hidden="true"
        className="absolute inset-0 animate-ping rounded-full bg-[#25D366] opacity-75"
      />
      <svg viewBox="0 0 32 32" aria-hidden="true" className="relative size-8 fill-white">
        <path d="M16.004 3C9.377 3 4 8.373 4 15c0 2.386.7 4.61 1.902 6.478L4 29l7.72-1.87A11.94 11.94 0 0 0 16.004 27C22.63 27 28 21.627 28 15S22.63 3 16.004 3Zm0 21.818a9.78 9.78 0 0 1-4.995-1.365l-.358-.213-4.583 1.11 1.223-4.465-.234-.365A9.78 9.78 0 0 1 5.818 15c0-5.618 4.568-10.182 10.186-10.182 5.618 0 10.182 4.564 10.182 10.182 0 5.618-4.564 10.182-10.182 10.182Zm5.593-7.632c-.306-.153-1.81-.893-2.09-.995-.28-.102-.484-.153-.688.153-.204.306-.79.995-.968 1.199-.178.204-.357.23-.663.077-.306-.153-1.292-.476-2.462-1.518-.91-.812-1.524-1.815-1.702-2.121-.178-.306-.019-.471.134-.624.137-.137.306-.357.459-.535.153-.178.204-.306.306-.51.102-.204.05-.383-.026-.535-.077-.153-.688-1.658-.943-2.27-.248-.596-.5-.516-.688-.526l-.586-.01c-.204 0-.535.077-.815.383s-1.068 1.043-1.068 2.545 1.093 2.955 1.245 3.16c.153.204 2.15 3.283 5.21 4.604.728.314 1.296.502 1.739.642.73.232 1.394.2 1.92.121.586-.087 1.81-.74 2.065-1.454.255-.714.255-1.325.178-1.454-.076-.128-.28-.204-.586-.357Z" />
      </svg>
    </a>
  );
}
