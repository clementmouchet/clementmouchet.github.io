---
layout: post
title:  "ckan-docker updated"
date:   2014-11-30 12:00:00
categories: ckan docker update
intro: "New data only container to simplify persistance"
---

Checkout the update of [ckan-docker on Github](https://github.com/ckan/ckan-docker)

It's a big update that adds a data container to the project to store CKAN FileStore and Postgres Data & config.

After a few weeks working with this project for a client, I have realised how important that is and that `docker cp` and `pg_dump` are not quick enough to keep your productivity up.

It's very easy to use; in `fig.yml`, a service called data is built from the data Dockerfile

{% highlight yaml %}
data:
  build: docker/data
  hostname: data
  domainname: localdomain
{% endhighlight %}

... and the Postgres & CKAN containers inherites the volumes from the data container `/var/lib/ckan`, `/etc/postgresql/9.3/main`, `/var/lib/postgresql/9.3/main` with the `volumes_from` instruction

{% highlight yaml %}
  volumes_from:
    - data
{% endhighlight %}

Of course custom location can be set if you decide to use other locations, but I deliberatelly chose to override standard locations by default, to make it easier to takeon by anyone.
The locations are identified by environement variables when the image is created, so you would only have to change their values and the value of volumes to match it.


<p class="well text-center">
	<a href="https://github.com/ckan/ckan-docker">Check this out on CKAN Github repo</a>
</p>

Cheers,

Clément
