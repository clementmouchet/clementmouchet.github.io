---
layout: default
title: Blog
permalink: /blog/
---


<!-- This loops through the paginated posts -->
{% for post in site.posts %}
  <h1><a href="{{ post.url }}">{{ post.title }}</a></h1>
  <p class="author">
    <span class="date">{{ post.date }}</span>
  </p>
  <div class="content">
    {{ post.content }}
  </div>
  <hr>
  <br>
{% endfor %}