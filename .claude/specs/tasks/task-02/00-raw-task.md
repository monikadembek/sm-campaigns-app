# Task Specification

## Source

Azure DevOps Task: 02

## Goal

In the Angular project web-ng-app add new page that will allow to creaate new campaign.

## Context

Add new feature in web-ng-app to create new campaign.

## Scope

### In scope

- add new route: /campaigns/add that will have page with form to create new campaign
- add button 'Create campaign' on campaigns page at the top right corner

### Out of scope

## Behavior

User displays campaigns page and clicks on button 'Create campaign' and it navigates him to /campaigns/add page where we have form to create new campaign.
After submitting the form user gets navigated back to route /campaigns, where we can see refreshed list ofcampaigns.

## Edge Cases

- …

## Data / API

- add endpoint that will allow creating cammpaign with full data, the same data that we have in the form where we edit campaign, because currently we can create new campaign only with name and goalId.

## Acceptance (DEV)

- build passes
- tests added
- no breaking changes
