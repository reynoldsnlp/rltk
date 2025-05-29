<?xml version="1.0" encoding="UTF-8"?>
<%@page contentType="text/html; charset=UTF-8"%>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
<title>Signed in to VIEW via OpenID</title>
<script src="../js-lib/jquery-1.4.2.min.js"></script>
<script src="../js-lib/view.js"></script>
<script src="../js-lib/cookies.js"></script>
<script>
// <!--
	function main(userid) {
		var prevUserid = wertiview.cookies.getCookie(document, wertiview.COOKIE_NAME);
		wertiview.cookies.setCookie(document, wertiview.COOKIE_NAME, userid, 10, wertiview.COOKIE_PATH);

		if (prevUserid != null && prevUserid != userid) {
			var div = document.getElementById("signed-out-message");
			div.style.visibility = "visible"; 
			var span = document.getElementById("signed-out-id");
			span.innerHTML = prevUserid;
		};
	}
// --> 
</script>
<meta http-equiv="Content-Type"
	content="application/xhtml+xml; charset=UTF-8" />
<link type="text/css" href="/VIEW/view.css" rel="stylesheet" />
</head>
<body onload="main('<%=request.getParameter("openid.identity")%>');">
	<div id="wrapper">
		<div id="main">
			<div id="mainpartwrapper">
				<div id="mainpart">
					<h1>Sign-in successful</h1>
					<p>
						You are now signed in to VIEW with the OpenID '<%=request.getParameter("openid.identity")%>'.
					</p>
					<div id="signed-out-message" style="visibility: hidden;">
						<h1>Automatic Sign-out</h1>
						<p>The OpenID '<span id="signed-out-id"></span>' was
						signed out of VIEW. Please note that you remain
						signed-in with your OpenID Provider.</p>
					</div>
				</div>
			</div>
		</div>
	</div>
</body>
</html>
