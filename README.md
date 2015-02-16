# xnlogic

Bootstrap your [xnlogic.com](http://xnlogic.com) application with this easy to use executable gem.

![gem install xnlogic](https://raw.githubusercontent.com/wiki/xnlogic/xn-gem-template/gif/readme_header.gif)

## Installation

    $ gem install xnlogic

 
## Usage
 
    $ xnlogic application my_app --key xnuser:xnpassword --up
    $ cd my_app
    $ xnlogic ssh

From the Vagrant VM, you can then: 

    $ xn-server
    $ xn-console


## Reference

The general syntax of the command-line tool is

    $ xnlogic COMMAND [ARGS] [OPTIONS]
    
And the following commands are available:

| Command | Description |
| ------- | ----------- |
| `application` | Create/update an application. |
| `up` | Start a development VM |
| `ssh` | Log in to a running development VM |
| `vm_config`   | Update the configuration and settings of an application. |
| `provision`   | Apply configuration updates to a running VM |
| `server_profiles` | Generates a server profile that can be used to configure a production deployment. |
| `gem_sources` | List gem sources required by this application |
| `version` | Print the version of the command-line tool |
| `help` | Display a help page |

You can get more information on each command using

    $ xnlogic help COMMAND



## Contributing

Pull-requests are welcome.
If you submit a pull-request, please create a feature branch for your changes.

#### Using the CLI in development

To execute from your checked out development version, run it as follows:

    ruby -I ~/dev/xnlogic/lib ~/dev/xnlogic/bin/xnlogic vm_config

#### Releasing a new gem to rubygems:

CI is not set up yet, so once you're happy with the release, simply:

    $ rake local_release


