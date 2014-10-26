---
layout: post
title:  "CKAN Docker Official Repo"
date:   2014-10-26 12:00:00
categories: CKAN Docker Fig Vagrant Development Deployment Automation Community
intro: "My little project is now part of the CKAN organisation"
---

A few days ago I submitted a [pull request](https://github.com/ckan/ckan/pull/1991) to share my work on Docker for CKAN with the rest of the community.

But it's a little too big :) ...
<strong>37 files changed</strong> with <strong class="text-success">1,266 additions</strong> and <strong class="text-danger">115 deletions</strong>.

So we've decided to move the Docker, Fig & Vagrant stuff out of the main CKAN repo, which makes a lot of sense.

In the meantime I've officially become a [member of the CKAN organisation on Github](https://github.com/orgs/ckan/people) which is pretty cool!

Extracting the Docker stuff out got me thinking a lot, and I re-factored even more stuff.

I've come up with a radically different tree structure:

{% highlight bash %}

├── Dockerfile 			# CKAN Dockerfile
├── LICENCE
├── README.md
├── Vagrantfile			# CKAN Vagrantfile
├── _etc 			# config files copied to /etc
│   ├── README.md
│   ├── apache2
│   │   ├── apache.conf
│   │   └── apache.wsgi
│   ├── ckan
│   │   └── custom_options.ini
│   ├── cron.d
│   │   └── ckan
│   ├── my_init.d
│   │   └── 55_configure
│   ├── nginx
│   │   └── nginx.conf
│   ├── postfix
│   │   └── main.cf
│   └── supervisor
│       └── conf.d
├── _service-provider 		# any service provider used in the portal
│   ├── README.md
│   └── datapusher
├── _solr			# any custom schema
│   ├── README.md
│   └── schema.xml
├── _src 			# CKAN & extensions source code
│   ├── README.md
│   ├── ckan
│   └── ckanext-...
├── docker 			# Dockerfiles & supporting files
│   ├── ckan
│   │   ├── my_init.d
│   │   ├── pip_install_req.sh
│   │   └── svc
│   ├── fig
│   │   ├── Dockerfile
│   │   └── README.md
│   ├── insecure_key
│   ├── nginx
│   │   ├── Dockerfile
│   │   └── cmd.sh
│   ├── postgres
│   │   ├── Dockerfile
│   │   └── svc
│   └── solr
│       ├── Dockerfile
│       └── svc
├── fig.yml
├── vagrant			# Vagrant Docker host (used in OS X & Windows)
└── docker-host
    └── Vagrantfile

{% endhighlight %}

The point of this structure if that it should be easy to manage your entire project.
This should be able to wrap everything you need in there, and package it.

I've also consolidated the various Dockerfiles I wrote for CKAN (default, custom & dev) into one :)

- all processes are managed by supervisor, which makes it easier to shut-down Apache in a development context, and use paster instead.
- Nginx now gone from the CKAN Dockerfile, and this service is now handled by another container as it should
- The requirement of being able to make live edits on the code for development is covered by mounting a volume as source directory, which overrides the data that was initially copied in the container. Pip requirements remain and I just have to re-install the packages automatically as part of the init process.
- I've added a lot of `ONBUILD` triggers that allow building children images for dev & prod, which covers what I was initially doing with my custom Dockerfile.
-I've also extracted the datapusher from the CKAN config, into a separate container.

And there is more...

<p class="well text-center">
	<a href="https://github.com/ckan/ckan-docker">Check this out on CKAN Github repo</a>
</p>

Cheers,

Clément
