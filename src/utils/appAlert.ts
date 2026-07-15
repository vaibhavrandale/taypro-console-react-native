import type { ReactNode } from 'react';

export type AppAlertButtonStyle = 'default' | 'cancel' | 'destructive';

export type AppAlertButton = {
  text: string;
  style?: AppAlertButtonStyle;
  onPress?: () => void;
};

export type AppAlertVariant = 'info' | 'success' | 'error' | 'warning';

export type AppAlertPayload = {
  title: string;
  message?: string;
  buttons: AppAlertButton[];
  variant: AppAlertVariant;
};

type Listener = (payload: AppAlertPayload | null) => void;

let listener: Listener | null = null;
const pending: AppAlertPayload[] = [];

export function bindAppAlertHost(next: Listener) {
  listener = next;
  if (pending.length > 0) {
    const first = pending.shift() ?? null;
    next(first);
  }
  return () => {
    if (listener === next) listener = null;
  };
}

function inferVariant(title: string, message?: string): AppAlertVariant {
  const text = `${title} ${message ?? ''}`.toLowerCase();
  if (/(fail|error|denied|unavailable|could not|unable|invalid)/.test(text)) {
    return 'error';
  }
  if (
    /(success|saved|updated|submitted|command sent|resolved)/.test(text) ||
    /^punch (in|out)$/i.test(title.trim())
  ) {
    return 'success';
  }
  if (/(required|missing|select|incomplete|warning|access)/.test(text)) {
    return 'warning';
  }
  return 'info';
}

/** Drop-in replacement for React Native Alert.alert. */
export function appAlert(
  title: string,
  message?: string,
  buttons?: AppAlertButton[],
) {
  const payload: AppAlertPayload = {
    title,
    message,
    buttons:
      buttons && buttons.length > 0
        ? buttons
        : [{ text: 'OK', style: 'default' }],
    variant: inferVariant(title, message),
  };

  if (listener) {
    listener(payload);
    return;
  }
  pending.push(payload);
}

export function dismissAppAlert() {
  listener?.(null);
}

export type AppAlertHostRenderProps = {
  children?: ReactNode;
};
