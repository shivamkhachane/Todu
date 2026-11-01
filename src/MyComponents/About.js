import React from 'react';

export const About = () => (
  <section className="about-page">
    <div className="eyebrow">ABOUT TODU</div>
    <h1>A little more focus, every day.</h1>
    <p className="about-intro">
      Todu gives you a quiet, simple place to keep track of the work you want to get done.
    </p>
    <div className="about-card">
      <h2>What you can do</h2>
      <ul>
        <li>Create an account and sign in to your personal workspace.</li>
        <li>Add, edit, complete, and reopen tasks; recover recent deletions with Undo.</li>
        <li>Search descriptions, filter by date or status, and sort tasks by date.</li>
        <li>Export tasks for a date range.</li>
      </ul>
    </div>
    <p className="about-footnote">
      Your account and task data are managed by the connected application service.
    </p>
  </section>
);
