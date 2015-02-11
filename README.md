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

----

## Command-Line Tool Reference

The xnlogic command-line tool (installed via `gem install xnlogic`) is used with the following syntax:

    $ xnlogic COMMAND [OPTIONS]
    
The following commands are available:

| Command | Description |
| ------- | ----------- |
| `application` | Create/update an application. |
| `vm_config`   | Update the configuration and settings of an application. |
| `server_profiles` | Generates a server profile that can be used to configure a production deployment. |
| `up` | Start a development VM |
| `ssh` | Log in to a running development VM |
| `provision` | Update configuration of a running VM |
| `gem_sources` | List gem sources required by this application |
| `help` | Display a help page |
| `version` | Print the version of the command-line tool |

You can get more information on each command using

    $ xnlogic help COMMAND



## Contributing

1. Fork it ( https://github.com/xnlogic/xnlogic/fork )
2. Create your feature branch (`git checkout -b my-new-feature`)
3. Commit your changes (`git commit -am 'Add some feature'`)
4. Push to the branch (`git push origin my-new-feature`)
5. Create a new Pull Request

#### Using the CLI in development

To execute from your checked out development version, run it as follows:

    ruby -I ~/dev/xnlogic/lib ~/dev/xnlogic/bin/xnlogic vm_config

#### Releasing a new gem to rubygems:

CI is not set up yet, so once you're happy with the release, simply:

    $ rake local_release


