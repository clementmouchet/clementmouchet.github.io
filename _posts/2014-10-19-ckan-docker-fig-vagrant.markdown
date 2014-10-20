---
layout: post
title:  "CKAN Development & Deployment using Docker, Fig & Vagrant"
date:   2014-10-19 12:00:00
categories: CKAN Docker Fig Vagrant Development Deployment Automation
intro: "Thoughts and actions about CKAN development, packaging & deployment"
---


# Intro

When I discovered CKAN over a year ago it was version 1.7 or 8 and the implementation I studied was using Elastic Search for indexing... I was really confused by the complexity of the setup and it took me a few attempts to get my "play box" right.

By the time I started working on a project based on CKAN 2.2. the documentation had improved tremendously, and projects such as [Data.gov.uk To Go](http://data.gov.uk/blog/datagovuk-to-go) as well as [CKAN Packaging Scripts](https://github.com/ckan/ckan-packaging) have really improved the way you can package &amp; deploy the many components of a typical CKAN portal.

A few months ago I gave a short talk on CKAN at a [JBug Scotland event](https://developer.jboss.org/groups/jbug-scotland/blog/2014/04/11/ckan-for-open-data-platforms--lightning-session-2-slides-from-event-on-3rd-april) and I was really amazed by Ian Lawson presentation on OpenShift. A few months after that I discovered Docker. And also found out that [OpenShift was going to support Docker](http://www.redhat.com/en/about/press-releases/red-hat-and-dotcloud-collaborate-on-docker-to-bring-next-generation-linux-container-enhancements-to-openshift)

I thought this was a really good news, because that meant that if I "containerised" my CKAN install I could use the same containers in every environments I'm working on, Dev, Test, Staging, Prod, Cloud!... and I wasn't the only one thinking that way, in May Nick Stenning make a great Pull Request with [the first containers for CKAN](https://github.com/ckan/ckan/pull/1724)

There were a few issues though, such as the absence of datastore, inability to setup the ckanext-spatial because PostGIS was not installed, editing the config was complex and not very flexible, and the three containers were using different bases which meant that you were pulling three bases images instead of caching one.



# Standing on the shoulders of giants

I picked up from there as re-factored the containers one by one, starting with Postgres, then Solr &amp; CKAN. When that was done I created another Dockerfile that extends the main CKAN Dockerfile to allow custom configurations based on the core project.


*   All containers extend the same base image [`phusion/baseimage`](https://phusion.github.io/baseimage-docker/) (updated to 0.9.13), which means you only pull &amp; cache them once, the first few steps are also identical to rely on Docker cache as much as possible

*   The Postgres container installs PostGIS, configures the database, the datastore &amp; PostGIS on the CKAN database.
The default names &amp; passwords can easily be overridden with environment variables.

*   The Solr container has been updated to 4.10.1

*   The CKAN Core container has been updated to configure the datapusher, has all the dependencies required to use the spatial extension &amp; also supervisor to manage tasks.

*   The custom config shows how to extend the Core container to enable common extensions such as ckanext-viewhelpers, ckanext-archiver, ckanext-spatial, ckanext-harvest, and how you can extract services such as redis from the CKAN container and let that service be handled by a separate container.



# Docker

Building containers is easy, caching is powerful. But you need to cheat sometimes, especially with the `ADD` command.
In the Solr container for instance, I quickly realised that the following command:

	ADD https://archive.apache.org/dist/lucene/solr/$SOLR_VERSION/$SOLR.tgz

is not cached, whereas

	RUN wget --progress=bar:force https://archive.apache.org/dist/lucene/solr/$SOLR_VERSION/$SOLR.tgz

is.

And since Solr tar is over a 100Mb, so installing wget & cheating is really worth it!
In some cases like that `RUN` is more appropriate than `ADD`, but it really depends on the use case.

Managing containers can be tedious, especially when you're developing them. There are a lot of tools to help. I've not tried [Shipyard](http://shipyard-project.com) yet but I will soon. In the meantime [docker-cleanup](https://github.com/blueyed/dotfiles/blob/master/usr/bin/docker-cleanup) is pretty useful, and the usual `docker stop $(docker ps -aq)` & `docker rm $(docker ps -aq)` work great to clean-up any running containers

But when I'm working with a custom Docker container I have to type (or copy & paste) 4 commands to build them, 4 commands to run them... and just as many to stop the containers

{% highlight bash linenos %}

#  build the containers locally
docker build --tag="clementmouchet/postgres" .
docker build --tag="clementmouchet/solr" .
docker build --tag="clementmouchet/ckan" .

# build your custom container
docker build --tag="clementmouchet/ckan_custom" .

docker run -d --name postgres -h postgres.docker.local clementmouchet/postgres
docker run -d --name solr -h solr.docker.local clementmouchet/solr
docker run -d --name redis -h redis.docker.local redis

docker run \
    -d \
    --name ckan \
    -h ckan.docker.local \
    -p 80:80 \
    -p 8800:8800 \
    --link postgres:postgres \
    --link solr:solr \
    --link redis:redis \
    clementmouchet/ckan_custom

{% endhighlight %}

This is a bit tedious, and that's why I looked at [Fig](http://www.fig.sh)


# Fig

[Fig](http://www.fig.sh) allows you to define all the above in a single YAML file to do the following:

*	start, stop and rebuild services
*	view the status of running services
*	tail running services' log output
*	run a one-off command on a service

so the 8+ commands above are reduced to 1: `fig up` thanks to the definition below:

{% highlight YAML linenos %}

postgres:
  build: ../postgresql
  hostname: postgres
  domainname: docker.local
  environment:
    - CKAN_PASS=ckan_pass
    - DATASTORE_PASS=datastore_pass
solr:
  build: ../../../ckan/config/solr
  hostname: solr
  domainname: docker.local
redis:
  image: redis:2.8
  hostname: redis
  domainname: docker.local
ckan:
  build: .
  hostname: ckan
  domainname: docker.local
  ports:
    - "80:80"
    - "8800:8800"
  links:
    - postgres:postgres
    - solr:solr
    - redis:redis


{% endhighlight %}

And fig can simplify the rest of the docker commands you want to run, to view logs etc.

# Vagrant

Now you may wonder why do you need/want Vagrant? The whole point about Docker is that containers are not VMs, and Fig has reduced the complexity of managing containers, why would you want to bring virtualisation back in the picture?

Well the answer is simple: portability. I have a personal Mac, a work PC, and Linux servers... Docker will work on all those operating systems; natively on Linux and through proxy a VM on OS X & Windows: [Boot2docker](http://boot2docker.io). I love this project, it's fast, lightweight & simple to use, but it doesn't support volumes & shared folders on Windows yet ([Boot2docker 1.3 offers partial support on Mac OS X](https://blog.docker.com/2014/10/docker-1-3-signed-images-process-injection-security-options-mac-shared-directories/)), and it's not really representing your production host.

That's why I think Vagrant is useful, and I was really excited to see [support for Docker added in Vagrant 1.6](https://www.vagrantup.com/blog/feature-preview-vagrant-1-6-docker-dev-environments.html)

My goal was you make sure than any development environment would represent production and behave exactly the same. This also helps portability of the environment, since a simple command: `vagrant up --provider=docker --no-parallel` will create Linux hosts running Docker if required (OSX & Windows), build & run boot all the containers in order & mount the source directory on your machine as a volume inside the container.

The development Dockerfile is slightly different & designed to be lightweight, Apache & Nginx are not installed. `paster serve` does just what you want on a dev box. `vagrant ssh` also works a treat with [`Phusion baseimage`](https://phusion.github.io/baseimage-docker/) and you can ssh directly into the container.

# Wrap up

That was a great personal journey into containerisation & virtualisation to build consistent & portable development environments.
There's still to be done on the core Dockerfile to extract Nginx from the main container & link the official Ngnix container instead.
The Example Vagrant file is really just a template to show what's possible but at the moment it only maps the CKAN source directory, so you would have to add new synced folders to build your custom extensions. It's just one step further, and hopefully it's just a start.

# Next

<p class="well text-center">
	<a href="https://github.com/clementmouchet/ckan/tree/1957-improved-dockerfiles">Check this out on my Github repo</a>
</p>

Clément

# References

_some really good reading_

*	[Vagrant with Docker: How to set up Postgres, Elasticsearch and Redis on Mac OS X -- maori.geek](http://www.maori.geek.nz/post/vagrant_with_docker_how_to_set_up_postgres_elasticsearch_and_redis_on_mac_os_x)
*	[Vagrant 1.6 Feature Preview: Docker-Based Development Environments - Vagrant](https://www.vagrantup.com/blog/feature-preview-vagrant-1-6-docker-dev-environments.html)
*	[Building a Development Environment with Docker - Terse Systems](http://tersesystems.com/2013/11/20/building-a-development-environment-with-docker/)
*	[A Rails Development Environment with Docker and Vagrant](http://www.talkingquickly.co.uk/2014/06/rails-development-environment-with-vagrant-and-docker/)
*	[VirtualBox guest-specific operations error · Issue #81 · tmatilai/vagrant-proxyconf](https://github.com/tmatilai/vagrant-proxyconf/issues/81)
*	[Setting up a development environment using Docker and Vagrant - Zenika](http://blog.zenika.com/index.php?post/2014/10/07/Setting-up-a-development-environment-using-Docker-and-Vagrant)
*	[vagrant-cachier :: viewdocs.io](http://fgrehm.viewdocs.io/vagrant-cachier)
*	[Docker in OSX via boot2docker or Vagrant: getting over the hump](http://macyves.wordpress.com/2014/05/31/docker-in-osx-via-boot2docker-or-vagrant-getting-over-the-hump/)
*	[Rails Development Using Docker and Vagrant - Abe Voelker](https://blog.abevoelker.com/rails-development-using-docker-and-vagrant/)
*	[Vagrant Synced Folders Permissions - jeremykendall.net](http://jeremykendall.net/2013/08/09/vagrant-synced-folders-permissions/)
*	[Dockerfile.tmpl](https://gist.github.com/mattes/2d0ffd027cb16571895c#file-readme-md)
*	[Get Started with Docker Containers in RHEL 7 - Red Hat Customer Portal](https://access.redhat.com/articles/881893#inside)
*	[Docker - OpenStack](https://wiki.openstack.org/wiki/Docker)
*	[bnchdrff/dockerfiles](https://github.com/bnchdrff/dockerfiles)
*	[Docker Images / Demo CKAN](http://git.abstract.it/docker-images/demo-ckan/tree/master)
*	[Allow customised CKAN Docker images (fixes #1904) by cygri · Pull Request #1929 · ckan/ckan · GitHub](https://github.com/ckan/ckan/pull/1929)
*	[Quickly SSH into a Docker container](http://geraldkaszuba.com/quickly-ssh-into-a-docker-container/)
*	[harbur/docker-workshop](https://github.com/harbur/docker-workshop)
*	[How to Use Docker on OS X: The Missing Guide](http://viget.com/extend/how-to-use-docker-on-os-x-the-missing-guide)
*	[Use Docker to Build a LEMP Stack (Buildfile)](http://software.danielwatrous.com/use-docker-to-build-a-lemp-stack-buildfile/)
