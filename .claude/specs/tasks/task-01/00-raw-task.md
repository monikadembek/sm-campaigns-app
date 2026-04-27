# Task Specification

## Source

Azure DevOps Task: 01

## Goal

In the Angular project web-ng-app add new page that will display selected campaign details.
It will allow to modify campaign data and and delete campaign.
It will also display posts which are included in that campaign.

## Context

Add new feature in web-ng-app called campaign.

## Scope

### In scope

- add new route: /campaigns/:id that we can pass selected campaign id as route param
- add resolver to that route that will fetch data for campaign with given id
- display campaign details
- display campaign posts
- allow deleting campaign
- allow editing campaign data

### Out of scope

- for now don't allow editing post content

## Behavior

User displays campaigns page and clicks on the selected campaign and it navigates him to /campaigns/campaignId page where campaign details are displayed.
We can edit data of campaign.
There is also button to delete campaign.
After deleting campaign user gets navigated back to route /campaigns.
We can see posts which are included in this campaign.

## Edge Cases

- …

## Data / API

- add endpoint that will allow editing campaign with given id

## Acceptance (DEV)

- build passes
- tests added
- no breaking changes
