help: ; @cat ./makefile
ssh: ; ssh -p 21098 -o HostKeyAlgorithms=+ssh-rsa \
	-o PubkeyAcceptedAlgorithms=+ssh-rsa wyncbqna@wynchar.com
upload up: ; rsync -CPazv --copy-links -e "ssh -p 21098" \
	--exclude ".git" --exclude "node_modules" \
	./ wyncbqna@wynchar.com:public_html/porto
uploadweb upw: ; rsync -CPazv --copy-links -e "ssh -p 21098" ./ \
	wyncbqna@wynchar.com:wynchar/porto
checkpoint cp: ; git st; git commit -am"checkpoint"
st: ; git st
diff: ; git diff
sizes: ; wc lib/*.dart | sort -n
