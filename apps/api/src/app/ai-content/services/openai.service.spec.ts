import { Test, TestingModule } from '@nestjs/testing';
import { ServiceUnavailableException } from '@nestjs/common';
import { OpenaiService } from './openai.service';
import OpenAI from 'openai';

jest.mock('openai');

describe('OpenaiService', () => {
  let service: OpenaiService;
  let mockCreate: jest.Mock;

  beforeEach(async () => {
    mockCreate = jest.fn();
    (OpenAI as jest.MockedClass<typeof OpenAI>).mockImplementation(
      () =>
        ({
          responses: { create: mockCreate },
        }) as unknown as OpenAI,
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [OpenaiService],
    }).compile();

    service = module.get<OpenaiService>(OpenaiService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateAiText', () => {
    const systemPrompt = 'You are a helpful assistant.';
    const userPrompt = 'Generate ideas.';

    it('should call OpenAI responses.create with correct parameters', async () => {
      mockCreate.mockResolvedValue({ output_text: '{"result": "ok"}' });

      await service.generateAiText(systemPrompt, userPrompt);

      expect(mockCreate).toHaveBeenCalledWith({
        model: 'gpt-5.4-mini',
        input: [
          { role: 'developer', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_output_tokens: 5000,
      });
    });

    it('should use custom model and maxOutputTokens when provided', async () => {
      mockCreate.mockResolvedValue({ output_text: '{}' });

      await service.generateAiText(
        systemPrompt,
        userPrompt,
        'gpt-5.4',
        8000,
        0.5,
      );

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-5.4',
          max_output_tokens: 8000,
          temperature: 0.5,
        }),
      );
    });

    it('should return the output_text from the response', async () => {
      const expectedText = '{"ideas": []}';
      mockCreate.mockResolvedValue({ output_text: expectedText });

      const result = await service.generateAiText(systemPrompt, userPrompt);

      expect(result).toBe(expectedText);
    });

    it('should throw ServiceUnavailableException when OpenAI call fails', async () => {
      const error = { error: { message: 'Rate limit exceeded' } };
      mockCreate.mockRejectedValue(error);

      await expect(
        service.generateAiText(systemPrompt, userPrompt),
      ).rejects.toThrow(ServiceUnavailableException);
    });

    it('should include error message in ServiceUnavailableException', async () => {
      const error = { error: { message: 'API key invalid' } };
      mockCreate.mockRejectedValue(error);

      try {
        await service.generateAiText(systemPrompt, userPrompt);
        fail('Expected ServiceUnavailableException');
      } catch (e) {
        expect(e).toBeInstanceOf(ServiceUnavailableException);
        expect(e.message).toBe('Generating text failed');
      }
    });

    it('should handle errors without error.message gracefully', async () => {
      mockCreate.mockRejectedValue(new Error('Network error'));

      await expect(
        service.generateAiText(systemPrompt, userPrompt),
      ).rejects.toThrow(ServiceUnavailableException);
    });
  });
});
