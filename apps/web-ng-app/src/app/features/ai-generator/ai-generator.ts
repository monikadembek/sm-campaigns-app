/* eslint-disable @typescript-eslint/no-unused-vars */
import { Component } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { StepperModule } from 'primeng/stepper';
import { InputTextModule } from 'primeng/inputtext';
import { CheckboxModule } from 'primeng/checkbox';
import { RadioButtonModule } from 'primeng/radiobutton';
import { TextareaModule } from 'primeng/textarea';
import { Step1 } from './components/step1/step1';
import { Step2 } from './components/step2/step2';
import { Step3 } from './components/step3/step3';

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
    Step2,
    Step3,
  ],
  templateUrl: './ai-generator.html',
  styleUrl: './ai-generator.css',
})
export class AiGenerator {}
