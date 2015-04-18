#! /bin/bash

TS=$(date +%s)
DIR=$HOME/diagnostics/$TS
mkdir -p $DIR/{etc,log,dotfiles}
mkdir -p $DIR/$XN_CLIENT/lib

which tree || sudo apt-get install tree

sudo netstat -lt
sudo netstat -lt > $DIR/netstat.txt
tree $XN_CLIENT > $DIR/tree-${XN_CLIENT}.txt
tree $HOME/.m2 > $DIR/tree-m2.txt
tree $HOME/.npm > $DIR/tree-npm.txt
tree /etc/{init,init.d} > $DIR/tree-init.txt
tree /opt/xn_apps > $DIR/tree-xn_apps.txt
which ruby > $DIR/ruby-version.txt
ruby -v >> $DIR/ruby-version.txt
rvm list 2>&1 >> $DIR/ruby-version.txt

cp -r $HOME/$XN_CLIENT/{config,script,Gemfile.lock,Jarfile.lock,${XN_CLIENT}.gemspec,torquebox.yml,torquebox_init.rb,Vagrantfile,config.ru,.gitignore} $DIR/$XN_CLIENT/lib
cp $HOME/$XN_CLIENT/lib/${XN_CLIENT}.rb $DIR/lib
cp $HOME/{.bash_logout,.bash_profile,.bashrc,.curlrc,.gemrc,.gitconfig,.irb-history,.mkshrc,.profile,.zlogin,.zsh_history,.zshrc} $DIR/dotfiles
sudo cp -r /etc/{datomic,mysql} $DIR/etc
mkdir -p $DIR/etc/init
sudo cp  /etc/init/{datomic,mysql}.conf $DIR/etc/init

sudo cp /var/log/datomic.log $DIR/log
mkdir -p $DIR/log/datomic
sudo cp /opt/datomic/current/log/$(date +%Y-%m-%d).log $DIR/log/datomic
cp $HOME/xn.dev/tmp/server.log $DIR/log
sudo cp -r /var/log/mysql $DIR/log

sudo chown -R $(whoami):$(whoami) $DIR
cd $DIR
tar -czvf $HOME/${XN_CLIENT}-diagnostics-${TS}.tgz .
cd -

rm -r $DIR

echo
echo Diagnostics file created at: \~/${XN_CLIENT}-diagnostics-${TS}.tgz
