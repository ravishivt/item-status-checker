import fetch from 'node-fetch';
import { load } from 'cheerio';
import { BehaviorSubject, Subject, interval } from 'rxjs';
import { mergeMap, distinctUntilChanged, throttle, tap, filter } from 'rxjs/operators';
import nodemailer from 'nodemailer';
import nconf from 'nconf';

import { initNconf } from '../config';

class Main {
  currentDelay: number;
  lastInvStatus = '';
  emailTransporter: any;
  checkerController$ = new BehaviorSubject(0);
  emailerController$ = new Subject<string>();

  constructor() {
    initNconf();
    this.currentDelay = nconf.get('checker:baseDelay');
    this.emailTransporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: nconf.get('emailer:gmailSenderUsername'),
        pass: nconf.get('emailer:gmailSenderPassword'),
      },
    });

    this.initEmailer();
    this.initChecker(this.checkStatus);
  }

  async initChecker(checkerFn: () => Promise<string>) {
    this.checkerController$
      .pipe(
        mergeMap((_ev) => checkerFn.apply(this)),
        mergeMap(async (invStatus) => {
          this.logStatus(invStatus);
          this.emailerController$.next(invStatus);
          return invStatus;
        }),
        mergeMap(async (invStatus) => {
          await new Promise((resolve) => setTimeout(resolve, this.currentDelay));
          this.currentDelay =
            invStatus === this.lastInvStatus
              ? Math.min(
                  Math.pow(this.currentDelay, nconf.get('checker:growthRate')),
                  nconf.get('checker:maxDelay'),
                )
              : nconf.get('checker:baseDelay');
          this.lastInvStatus = invStatus;
          this.checkerController$.next(0);
        }),
      )
      .subscribe();
  }

  async initEmailer() {
    this.emailerController$
      .pipe(
        filter((invStatus) => !!invStatus), // Ignore undefined vals
        distinctUntilChanged(),
        throttle((_ev) => interval(nconf.get('emailer:throttleBy'))),
        mergeMap(async (invStatus) => {
          await this.sendEmail(invStatus);
        }),
      )
      .subscribe();
  }

  async logStatus(invStatus: string) {
    if (invStatus !== this.lastInvStatus) {
      console.log(
        this.getLogPrefix() +
          `Item status has changed: "${invStatus}", resetting delay to ${
            nconf.get('checker:baseDelay') / 1000
          }s.`,
      );
    } else {
      console.log(
        this.getLogPrefix() +
          `Item status hasn't changed: "${invStatus}", waiting ${this.currentDelay / 1000}s.`,
      );
    }
  }

  async sendEmail(invStatus: string) {
    const info = await this.emailTransporter.sendMail({
      from: `"Web-Checker 👻" <${nconf.get('emailer:gmailSenderUsername')}>`, // sender address
      to: nconf.get('emailer:emailReceiver'), // list of receivers
      subject: 'Item Status Change', // Subject line
      text: `Item is now: "${invStatus}", ${nconf.get('checker:itemStatusLink')}`, // plain text body
      html: `<p>Item is now: "${invStatus}"</p><p><a href="${nconf.get(
        'checker:itemStatusLink',
      )}">Link</a></p>`, // html body
    });

    console.log(this.getLogPrefix() + 'Message sent: %s', info.messageId);
  }

  async checkStatus() {
    const itemStatusResponse = await fetch(nconf.get('checker:itemStatusLink'));
    const $ = load(await itemStatusResponse.text());
    const targetElement = $(nconf.get('checker:itemStatusSelector'));
    if (targetElement.length !== 1) {
      return 'Failed to find target item status element with configured selector';
    }
    return $(nconf.get('checker:itemStatusSelector')).text();
  }

  getLogPrefix() {
    return '[' + new Date().toUTCString() + '] ';
  }
}

export const main = new Main();
