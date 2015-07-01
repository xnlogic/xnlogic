#! /bin/bash

TS=$(date +%s)
DIR=$HOME/diagnostics/$TS
mkdir -p $DIR/{etc,log,dotfiles}
mkdir -p $DIR/$XN_CLIENT/lib

which tree || sudo apt-get install tree

sudo netstat -lt
sudo netstat -lt > $DIR/netstat.txt
sudo docker ps > $DIR/docker_ps.txt
sudo docker ps -a > $DIR/docker_ps_a.txt
sudo docker images > $DIR/docker_images.txt
sudo docker images -a > $DIR/docker_images_a.txt
tree $XN_CLIENT > $DIR/tree-${XN_CLIENT}.txt
tree $HOME/.npm > $DIR/tree-npm.txt
tree /etc/{init,init.d} > $DIR/tree-init.txt
which ruby > $DIR/ruby-version.txt
ruby -v >> $DIR/ruby-version.txt

cp -r $HOME/$XN_CLIENT/{config,script,Gemfile.lock,Jarfile.lock,${XN_CLIENT}.gemspec,Vagrantfile,config.ru,.gitignore,.dockerignore} $DIR/$XN_CLIENT
cp .git/config $DIR/git_config.txt
cp $HOME/$XN_CLIENT/lib/${XN_CLIENT}.rb $DIR/lib
cp $HOME/{.bash_logout,.bash_profile,.bashrc,.curlrc,.gemrc,.gitconfig,.irb-history,.mkshrc,.profile,.zlogin,.zsh_history,.zshrc} $DIR/dotfiles

docker ps -a | tr -s ' ' | awk '{print $NF}' | tail -n +2 | xargs -n 1 -I X bash -c "docker logs -t X > $DIR/log/X 2> $DIR/log/X.2"
docker ps -a | tr -s ' ' | awk '{print $NF}' | tail -n +2 | xargs -n 1 -I X bash -c "docker diff X > $DIR/log/X.diff"

sudo chown -R $(whoami):$(whoami) $DIR

cd $HOME
tar -czf $HOME/${XN_CLIENT}-diagnostics-${TS}.tgz diagnostics/$TS
cd -

rm -r $DIR

echo
echo Diagnostics file created at: \~/${XN_CLIENT}-diagnostics-${TS}.tgz
