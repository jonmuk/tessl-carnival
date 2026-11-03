---
name: review-pii-disclosure
description: Review a code change for personal data (PII) that the change itself adds to the repository, or newly collects, stores or sends. Use as one lens in a code review run.
---

# Review lens: PII Disclosure

Review what a change puts into the repository and what it starts doing with
data about people. Anything committed here is public in every fork, and stays in
git history after it is deleted.

## Scope

- **Committed personal data** Real names tied to contact details, email
  addresses, phone numbers, postal addresses, dates of birth, government or
  account identifiers, IP addresses, or photos of people, written into source,
  tests, fixtures, docs, screenshots or config by the change.
- **New collection and storage** A change that starts asking players for, or
  keeping, data about them: what it keeps, where (local storage, a URL, a log),
  and for how long.
- **New sending** A change that starts passing personal data to a network
  request, an analytics call, the console or an error message.

Trust boundaries, authorization, injection and secrets belong to
`review-security-and-privacy`. Do not report them here.

## Method

Read every added line, including Markdown, JSON, YAML and test data, and ask of
each literal whether it identifies or contacts a real person. Then follow any new
input field, URL parameter or stored value to where it is kept and where it is
sent.

## Threshold

Report a finding when the change adds data that identifies or contacts a real
person, or starts collecting, keeping or sending such data without the change
saying why it needs it.

Do not report:

- Placeholders that identify nobody: `example.com` or `example.org` addresses,
  names such as Jane Doe or Player 1, `555-01xx` numbers, documentation IP
  ranges, and obviously invented values in `*.test.ts`.
- Public project contacts the repository already publishes, such as the address
  in `SECURITY.md`, and GitHub usernames in links, issue references or
  `Co-Authored-By` lines.
- Names of games, characters and prizes, and scores, which say nothing about who
  played.
- Lines the change only moves or reformats without adding new personal data.

## Reporting

- Name the file and line, the kind of personal data, and who can now see it:
  everyone who reads or forks the repository, or anyone with access to the
  browser.
- State the fix: replace it with a placeholder, drop the field, keep it out of
  the log or request. For data already committed, say that deleting the line
  does not remove it from git history, and that the owner should rewrite history
  or treat the data as exposed.
