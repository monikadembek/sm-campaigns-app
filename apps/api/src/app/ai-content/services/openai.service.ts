import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';

import {
  MAX_OUTPUT_TOKENS_LIMIT_DEFAULT,
  GPT_5_MINI_VERSION,
} from '../../constants';
import OpenAI from 'openai';

export type Model = 'gpt-5.4' | 'gpt-5.1' | 'gpt-5.4-mini';

@Injectable()
export class OpenaiService {
  private readonly logger = new Logger(OpenaiService.name);
  private readonly client: OpenAI;

  constructor() {
    this.client = new OpenAI();
  }

  async generateAiText(
    systemPrompt: string,
    userPrompt: string,
    model: Model = GPT_5_MINI_VERSION,
    maxOutputTokens = MAX_OUTPUT_TOKENS_LIMIT_DEFAULT,
    temperature = 0.7,
  ): Promise<string> {
    try {
      const response = await this.client.responses.create({
        model,
        // reasoning: { effort: 'none' },
        input: [
          {
            role: 'developer',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: userPrompt,
          },
        ],
        temperature,
        max_output_tokens: maxOutputTokens,
      });

      this.logger.debug('response: ', response);
      this.logger.debug('response text: ', response.output_text);
      return response.output_text;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      this.logger.error(error);
      throw new ServiceUnavailableException(
        'Generating text failed',
        error?.error?.message,
      );
    }
  }
}
