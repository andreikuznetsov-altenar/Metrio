import { ApiError } from '../../platform/apiTypes';
import { SetupError } from './setupErrors';

export function mapBambooConnectionError(error: unknown): SetupError {
  if (error instanceof SetupError) return error;

  if (error instanceof ApiError) {
    if (error.status === 401 || error.code === 'bamboo_auth_invalid') {
      return new SetupError(
        'bamboo_invalid',
        "BambooHR couldn't verify your API key. Check the key and try again.",
      );
    }
    if (error.code === 'network_error' || error.code === 'timeout_error') {
      return new SetupError(
        'network',
        "Metrio couldn't reach BambooHR. Check your connection and try again.",
      );
    }
    if (error.code === 'tls_error') {
      return new SetupError(
        'network',
        'Metrio could not establish a secure connection to BambooHR.',
      );
    }
    return new SetupError(
      'bamboo_invalid',
      "BambooHR couldn't verify your API key. Check the key and try again.",
    );
  }

  return new SetupError(
    'bamboo_invalid',
    "BambooHR couldn't verify your API key. Check the key and try again.",
  );
}
