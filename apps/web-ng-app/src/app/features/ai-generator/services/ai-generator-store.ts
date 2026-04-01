import { Injectable, signal } from '@angular/core';
import {
  GeneratedPostContent,
  PostIdea,
  ToneStyle,
} from '@sm-campaigns-app/datatypes';

@Injectable({
  providedIn: 'root',
})
export class AiGeneratorStore {
  ideasExample = [
    {
      title: 'Meet Tshirts Club',
      summary:
        'Introduce the new Etsy shop and show off the vibe …he first collection and share their favorite tee.',
      platform: 'FACEBOOK',
      suggestedPostType: 'IMAGE',
      id: '0a5d79b3-44bf-44f5-9ece-2cec0850bb37',
    },
    {
      title: 'From Idea to Tee',
      summary:
        'Share a quick behind-the-scenes look at how one cu… Keep it casual and personal to build connection.',
      platform: 'INSTAGRAM',
      suggestedPostType: 'REEL',
      id: '066d4cb6-6db4-4012-bac0-6ae229e567a6',
    },
    {
      title: 'Which Tee Fits You?',
      summary:
        'Post a few unique designs and ask followers to vot…and helping the shop learn what people love most.',
      platform: 'FACEBOOK',
      suggestedPostType: 'POLL',
      id: '9f2d0c2c-4ff0-4d1d-816c-57070843dc90',
    },
    {
      title: 'New Shop, Fresh Tees',
      summary:
        'Create a clean carousel showing best-selling style…e new Etsy store. Perfect for a first impression.',
      platform: 'INSTAGRAM',
      suggestedPostType: 'CAROUSEL',
      id: '629b24af-9e08-48c5-9f2e-29cc9092922e',
    },
    {
      title: 'Custom Tee Drop',
      summary:
        'Highlight a few standout shirts with bold visuals …unique. Keep it fun, casual, and scroll-stopping.',
      platform: 'FACEBOOK',
      suggestedPostType: 'IMAGE',
      id: '396e357a-eba5-4569-b0c3-95bd814fc735',
    },
    {
      title: 'Style Check: Tshirts Club',
      summary:
        'Use a reel to show different shirt designs in acti…nvite to visit the Etsy shop and pick a favorite.',
      platform: 'INSTAGRAM',
      suggestedPostType: 'REEL',
      id: 'ebe28484-7784-484f-ae31-87b81df2e945',
    },
  ];

  #ideas = signal<PostIdea[]>([]);
  #topic = signal<string>('');
  #tone = signal<ToneStyle>('CASUAL');
  #generatedPostsContent = signal<GeneratedPostContent[]>([]);

  ideas = this.#ideas.asReadonly();
  topic = this.#topic.asReadonly();
  tone = this.#tone.asReadonly();
  generatedPostsContent = this.#generatedPostsContent.asReadonly();

  setGeneratedIdeas(ideas: PostIdea[]) {
    this.#ideas.set(ideas);
  }

  setTopic(topic: string) {
    this.#topic.set(topic);
  }

  setTone(tone: ToneStyle) {
    this.#tone.set(tone);
  }

  setGeneratedPostsContent(posts: GeneratedPostContent[]) {
    this.#generatedPostsContent.set(posts);
  }
}
