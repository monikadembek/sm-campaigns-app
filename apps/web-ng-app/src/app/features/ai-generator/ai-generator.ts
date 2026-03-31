/* eslint-disable @typescript-eslint/no-unused-vars */
import { Component } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { StepperModule } from 'primeng/stepper';
import { InputTextModule } from 'primeng/inputtext';
import { CheckboxModule } from 'primeng/checkbox';
import { RadioButtonModule } from 'primeng/radiobutton';
import { TextareaModule } from 'primeng/textarea';
import { Step1 } from './components/step1';

@Component({
  selector: 'app-ai-generator',
  imports: [
    StepperModule,
    ButtonModule,
    InputTextModule,
    CheckboxModule,
    RadioButtonModule,
    TextareaModule,
    Step1,
  ],
  templateUrl: './ai-generator.html',
  styleUrl: './ai-generator.css',
})
export class AiGenerator {}
