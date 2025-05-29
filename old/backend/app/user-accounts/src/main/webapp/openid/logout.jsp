<?xml version="1.0" encoding="UTF-8"?>
<%@page contentType="text/html; charset=UTF-8"%>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
<title>Signed out of VIEW</title>
<script src="../js-lib/jquery-1.4.2.min.js"></script>
<script src="../js-lib/view.js"></script>
<script src="../js-lib/cookies.js"></script>
<script>
// <!--
	function main() {
		var prevUserid = wertiview.cookies.getCookie(document, wertiview.COOKIE_NAME);
		wertiview.cookies.deleteCookie(document, wertiview.COOKIE_NAME, wertiview.COOKIE_PATH);

		var divSuccess = document.getElementById("signed-out-message-success");
		var divFailure = document.getElementById("signed-out-message-failure");
		if (prevUserid != null) {
			divSuccess.style.visibility = "visible";
			var span = document.getElementById("signed-out-id");
			span.innerHTML = prevUserid;
		}
		else {
			divFailure.style.visibility = "visible";
		}
	}
// --> 
</script>
<meta http-equiv="Content-Type"
	content="application/xhtml+xml; charset=UTF-8" />
<link type="text/css" href="/VIEW/view.css" rel="stylesheet" />
</head>
<body onload="main();">
	<div id="wrapper">
		<div id="main">
			<div id="mainpartwrapper">
				<div id="mainpart">
					<div id="signed-out-message-success" style="visibility: hidden;">
						<h1>Sign-out successful</h1>
						<p>The OpenID '<span id="signed-out-id"></span>' was
						signed out of VIEW. Please note that you remain
						signed-in with your OpenID Provider.</p>
					</div>
					<div id="signed-out-message-failure" style="visibility: hidden;">
						<h1>No user to sign out</h1>
						<p>No one was signed in to VIEW, so there is no user
						to be signed out.</p>
					</div>
				</div>
			</div>
		</div>
	</div>
</body>
</html>
